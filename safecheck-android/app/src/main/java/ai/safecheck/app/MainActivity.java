package ai.safecheck.app;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.*;
import android.widget.Toast;

import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 4101;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private boolean ready;
    private String pendingText;
    private Uri pendingUri;
    private String pendingMime;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextRecognizer ocr;
    private BarcodeScanner barcode;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(8,17,31));
        getWindow().setNavigationBarColor(Color.rgb(8,17,31));
        ocr = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        barcode = BarcodeScanning.getClient();

        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "AndroidSafeCheck");
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageFinished(WebView view,String url){ ready=true; dispatchShare(); }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> cb,FileChooserParams p){
                if(fileCallback!=null) fileCallback.onReceiveValue(null);
                fileCallback=cb;
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp","application/pdf","text/plain"});
                startActivityForResult(i,PICK_FILE);
                return true;
            }
        });
        captureIntent(getIntent());
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override protected void onNewIntent(Intent i){ super.onNewIntent(i); setIntent(i); captureIntent(i); dispatchShare(); }

    private void captureIntent(Intent i){
        if(i==null || !Intent.ACTION_SEND.equals(i.getAction())) return;
        if(i.getType()!=null && i.getType().startsWith("text/")){
            CharSequence t=i.getCharSequenceExtra(Intent.EXTRA_TEXT); if(t!=null) pendingText=t.toString();
        }
        Uri u=i.getParcelableExtra(Intent.EXTRA_STREAM); if(u!=null){ pendingUri=u; pendingMime=i.getType(); }
    }

    private void dispatchShare(){
        if(!ready) return;
        if(pendingText!=null){ String t=pendingText; pendingText=null; js("window.SafeCheckNativeBridge.receiveSharedText("+JSONObject.quote(t)+")"); }
        if(pendingUri!=null){ Uri u=pendingUri; String m=pendingMime; pendingUri=null; pendingMime=null; process(u,m); }
    }

    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req!=PICK_FILE) return;
        Uri[] out=null;
        if(result==RESULT_OK && data!=null && data.getData()!=null){
            Uri u=data.getData(); out=new Uri[]{u}; process(u,getContentResolver().getType(u));
        }
        if(fileCallback!=null){ fileCallback.onReceiveValue(out); fileCallback=null; }
    }

    private void process(Uri uri,String mime){
        String name=nameOf(uri);
        if(mime==null) mime=getContentResolver().getType(uri);
        status("Analisando "+name+" no dispositivo…");
        if(mime!=null && mime.startsWith("image/")){ processImage(uri,name); return; }
        if("application/pdf".equals(mime) || name.toLowerCase().endsWith(".pdf")){ processPdf(uri,name); return; }
        if(mime!=null && mime.startsWith("text/")){ processText(uri,name); return; }
        deliver(name,"unsupported","",new JSONArray(),"Formato ainda não suportado. Use imagem, PDF, TXT ou cole o conteúdo.");
    }

    private void processImage(Uri uri,String name){
        try{
            InputImage image=InputImage.fromFilePath(this,uri);
            ocr.process(image).addOnSuccessListener(t->scanCodes(image,name,t.getText(),"image"))
                .addOnFailureListener(e->scanCodes(image,name,"","image"));
        }catch(Exception e){ deliver(name,"image","",new JSONArray(),"Não foi possível ler a imagem."); }
    }

    private void scanCodes(InputImage image,String name,String text,String type){
        barcode.process(image).addOnSuccessListener(list->{
            JSONArray codes=new JSONArray(); for(Barcode b:list){ if(b.getRawValue()!=null) codes.put(b.getRawValue()); }
            deliver(name,type,text,codes,(text.trim().isEmpty()&&codes.length()==0)?"Nenhum texto ou QR legível foi encontrado.":"");
        }).addOnFailureListener(e->deliver(name,type,text,new JSONArray(),""));
    }

    private void processPdf(Uri uri,String name){
        worker.execute(()->{
            ParcelFileDescriptor fd=null; PdfRenderer renderer=null; PdfRenderer.Page page=null; Bitmap bmp=null;
            try{
                fd=getContentResolver().openFileDescriptor(uri,"r");
                if(fd==null) throw new IOException();
                renderer=new PdfRenderer(fd);
                if(renderer.getPageCount()==0) throw new IOException();
                page=renderer.openPage(0);
                bmp=Bitmap.createBitmap(Math.max(1,page.getWidth()*2),Math.max(1,page.getHeight()*2),Bitmap.Config.ARGB_8888);
                bmp.eraseColor(Color.WHITE); page.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                InputImage image=InputImage.fromBitmap(bmp,0);
                PdfRenderer finalRenderer=renderer; ParcelFileDescriptor finalFd=fd; PdfRenderer.Page finalPage=page; Bitmap finalBmp=bmp;
                runOnUiThread(()->ocr.process(image).addOnSuccessListener(t->{
                    scanCodesWithCleanup(image,name,t.getText(),finalRenderer,finalFd,finalPage,finalBmp);
                }).addOnFailureListener(e->{ cleanup(finalRenderer,finalFd,finalPage,finalBmp); deliver(name,"document","",new JSONArray(),"Não foi possível extrair texto da primeira página do PDF."); }));
            }catch(Exception e){ cleanup(renderer,fd,page,bmp); runOnUiThread(()->deliver(name,"document","",new JSONArray(),"Não foi possível abrir o PDF.")); }
        });
    }

    private void scanCodesWithCleanup(InputImage image,String name,String text,PdfRenderer r,ParcelFileDescriptor fd,PdfRenderer.Page p,Bitmap b){
        barcode.process(image).addOnSuccessListener(list->{ JSONArray codes=new JSONArray(); for(Barcode c:list){ if(c.getRawValue()!=null) codes.put(c.getRawValue()); } cleanup(r,fd,p,b); deliver(name,"document",text,codes,"PDF: análise OCR da primeira página nesta build."); })
            .addOnFailureListener(e->{ cleanup(r,fd,p,b); deliver(name,"document",text,new JSONArray(),"PDF: análise OCR da primeira página nesta build."); });
    }

    private void processText(Uri uri,String name){
        worker.execute(()->{
            StringBuilder out=new StringBuilder();
            try(InputStream in=getContentResolver().openInputStream(uri); BufferedReader br=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){
                char[] buf=new char[4096]; int n; while((n=br.read(buf))>0 && out.length()<200000) out.append(buf,0,Math.min(n,200000-out.length()));
                runOnUiThread(()->deliver(name,"document",out.toString(),new JSONArray(),""));
            }catch(Exception e){ runOnUiThread(()->deliver(name,"document","",new JSONArray(),"Não foi possível ler o arquivo.")); }
        });
    }

    private void cleanup(PdfRenderer r,ParcelFileDescriptor fd,PdfRenderer.Page p,Bitmap b){
        try{if(p!=null)p.close();}catch(Exception ignored){} try{if(r!=null)r.close();}catch(Exception ignored){} try{if(fd!=null)fd.close();}catch(Exception ignored){} try{if(b!=null&&!b.isRecycled())b.recycle();}catch(Exception ignored){}
    }

    private String nameOf(Uri uri){
        String n="arquivo"; try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){ if(c!=null&&c.moveToFirst()){int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if(i>=0)n=c.getString(i);} }catch(Exception ignored){} return n==null?"arquivo":n;
    }

    private void deliver(String name,String type,String text,JSONArray codes,String warning){
        try{ JSONObject o=new JSONObject(); o.put("name",name);o.put("sourceType",type);o.put("text",text==null?"":text);o.put("barcodes",codes);o.put("warning",warning==null?"":warning); js("window.SafeCheckNativeBridge.receiveNativeExtraction("+o.toString()+")"); }catch(Exception e){status("Falha ao concluir análise local.");}
    }
    private void status(String m){ js("window.SafeCheckNativeBridge.status("+JSONObject.quote(m)+")"); }
    private void js(String code){ if(web!=null) web.post(()->web.evaluateJavascript(code,null)); }

    @Override public void onBackPressed(){ if(web!=null&&web.canGoBack())web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy(){ try{ocr.close();}catch(Exception ignored){} try{barcode.close();}catch(Exception ignored){} worker.shutdownNow(); if(web!=null)web.destroy(); super.onDestroy(); }

    public final class Bridge {
        @JavascriptInterface public void copyToClipboard(String text){ runOnUiThread(()->{ ClipboardManager c=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE); if(c!=null)c.setPrimaryClip(ClipData.newPlainText("SafeCheck AI",text)); Toast.makeText(MainActivity.this,"Copiado",Toast.LENGTH_SHORT).show(); }); }
        @JavascriptInterface public String getAppInfo(){ return "SafeCheck AI 1.0.0-beta · Android"; }
    }
}
