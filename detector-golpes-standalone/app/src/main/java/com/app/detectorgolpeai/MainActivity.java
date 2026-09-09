package com.app.detectorgolpeai;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 702;
    private static final String APP_VERSION = "2.2.0";
    private static final int DARK_SYSTEM = 0xFF020B11;
    private WebView webView;

    private static final String BRAND_SVG =
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 108 108\">" +
            "<defs><linearGradient id=\"b\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#06353b\"/><stop offset=\"1\" stop-color=\"#010a0f\"/></linearGradient>" +
            "<linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#8dffdd\"/><stop offset=\".45\" stop-color=\"#20e5a6\"/><stop offset=\"1\" stop-color=\"#00a878\"/></linearGradient></defs>" +
            "<rect x=\"4\" y=\"4\" width=\"100\" height=\"100\" rx=\"24\" fill=\"url(#b)\"/>" +
            "<path d=\"M54 16c-11 7-22 10-31 12v25c0 21 12 35 31 44 19-9 31-23 31-44V28c-9-2-20-5-31-12Z\" fill=\"#06343a\" stroke=\"url(#g)\" stroke-width=\"5\"/>" +
            "<path d=\"m35 55 13 13 27-30\" fill=\"none\" stroke=\"url(#g)\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
            "</svg>";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyDarkSystemBars();

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " SafeCheckAI-Android/" + APP_VERSION);

        WebView.setWebContentsDebuggingEnabled(false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("safecheck.local".equalsIgnoreCase(uri.getHost())) return false;
                String scheme = uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                    return true;
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("safecheck.local".equalsIgnoreCase(uri.getHost()) && "/safecheck_logo.jpg".equals(uri.getPath())) {
                    InputStream stream = new ByteArrayInputStream(BRAND_SVG.getBytes(StandardCharsets.UTF_8));
                    return new WebResourceResponse("image/svg+xml", "UTF-8", stream);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith("https://safecheck.local/")) injectRuntimePatches();
            }
        });
        webView.addJavascriptInterface(new NativeBridge(), "SafeCheckNative");
        setContentView(webView);

        String html = readAssetText("index.html");
        if (html == null || html.isEmpty()) {
            Toast.makeText(this, "Falha ao carregar a interface do aplicativo.", Toast.LENGTH_LONG).show();
            return;
        }
        webView.loadDataWithBaseURL("https://safecheck.local/", html, "text/html", "UTF-8", null);
    }

    private void applyDarkSystemBars() {
        getWindow().setStatusBarColor(DARK_SYSTEM);
        getWindow().setNavigationBarColor(DARK_SYSTEM);
        getWindow().getDecorView().setSystemUiVisibility(0);
    }

    private void injectRuntimePatches() {
        injectAsset("auth_patch.js");
        injectAsset("ui_patch.js");
        injectAsset("risk_patch.js");
    }

    private void injectAsset(String name) {
        String patch = readAssetText(name);
        if (patch == null || patch.isEmpty()) return;
        evaluate(patch);
    }

    private String readAssetText(String name) {
        try (InputStream input = getAssets().open(name);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return output.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return null;
        }
    }

    public class NativeBridge {
        @JavascriptInterface
        public void pickFile() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
                try { startActivityForResult(intent, PICK_FILE); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "Não foi possível abrir o seletor de arquivos.", Toast.LENGTH_LONG).show(); }
            });
        }

        @JavascriptInterface
        public void share(String value) {
            runOnUiThread(() -> {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_TEXT, value == null ? "" : value);
                startActivity(Intent.createChooser(share, "Compartilhar análise"));
            });
        }

        @JavascriptInterface
        public String appVersion() { return APP_VERSION; }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || resultCode != RESULT_OK || data == null || data.getData() == null) return;

        Uri uri = data.getData();
        try {
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContentResolver().takePersistableUriPermission(uri, flags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {}

        String fileName = resolveName(uri);
        String mime = getContentResolver().getType(uri);
        if (mime == null) mime = fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*";

        final String finalMime = mime;
        final String finalFileName = fileName;
        evaluate("window.onNativeFileStatus && window.onNativeFileStatus('processing', " + JSONObject.quote("Lendo " + fileName + "…") + ");");

        FileTextExtractor.extract(this, uri, mime, new FileTextExtractor.Callback() {
            @Override
            public void onSuccess(String extractedText, int pagesProcessed, boolean partial) {
                String note = partial ? "OCR parcial: primeiras " + pagesProcessed + " páginas." : "OCR concluído.";
                String js = "window.onNativeFileExtracted && window.onNativeFileExtracted(" +
                        JSONObject.quote(finalFileName) + "," + JSONObject.quote(finalMime) + "," +
                        JSONObject.quote(extractedText == null ? "" : extractedText) + "," + pagesProcessed + "," + partial + "," + JSONObject.quote(note) + ");";
                evaluate(js);
            }

            @Override
            public void onError(String message) {
                evaluate("window.onNativeFileStatus && window.onNativeFileStatus('error', " + JSONObject.quote(message) + ");");
            }
        });
    }

    private void evaluate(String javascript) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(javascript, null));
    }

    private String resolveName(Uri uri) {
        String name = "arquivo";
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) name = cursor.getString(index);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return name == null || name.isBlank() ? "arquivo" : name;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) evaluate("window.onSafeCheckResume && window.onSafeCheckResume();");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("SafeCheckNative");
            webView.destroy();
        }
        super.onDestroy();
    }
}
