package com.app.detectorgolpeai;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.database.Cursor;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final int PICK_ATTACHMENT = 71;
    private static final int BG = Color.rgb(246, 249, 249);
    private static final int INK = Color.rgb(23, 45, 50);
    private static final int MUTED = Color.rgb(92, 112, 117);
    private static final int PRIMARY = Color.rgb(23, 58, 63);
    private static final int ACCENT = Color.rgb(22, 124, 128);
    private static final int SUCCESS = Color.rgb(40, 150, 98);
    private static final int WARNING = Color.rgb(217, 154, 40);
    private static final int DANGER = Color.rgb(202, 66, 54);
    private static final String[] TYPES = {"Mensagem", "Site / Link", "PIX", "Oferta", "Anúncio", "Documento / Foto", "Perfil / Vendedor"};
    private static final String[] TYPE_IDS = {"message", "site", "pix", "offer", "ad", "document", "profile"};

    private SharedPreferences prefs;
    private Spinner typeSpinner;
    private EditText contentInput;
    private EditText contextInput;
    private TextView attachmentLabel;
    private Uri attachmentUri;
    private String attachmentName;
    private RiskReport lastReport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("detector_golpes_local", MODE_PRIVATE);
        getWindow().setStatusBarColor(PRIMARY);
        getWindow().setNavigationBarColor(Color.WHITE);
        showHome();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextSize(sp);
        v.setTextColor(color);
        v.setLineSpacing(0, 1.12f);
        if (bold) v.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return v;
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        return d;
    }

    private LinearLayout page(String title, String subtitle) {
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(18), dp(20), dp(18), dp(96));
        body.setBackgroundColor(BG);

        TextView t = text(title, 27, INK, true);
        body.addView(t);
        if (subtitle != null && !subtitle.isEmpty()) {
            TextView s = text(subtitle, 15, MUTED, false);
            LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            sp.topMargin = dp(6);
            sp.bottomMargin = dp(16);
            body.addView(s, sp);
        }
        return body;
    }

    private void render(LinearLayout body) {
        LinearLayout frame = new LinearLayout(this);
        frame.setOrientation(LinearLayout.VERTICAL);
        frame.setBackgroundColor(BG);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(body, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        frame.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        frame.addView(bottomNav(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(68)));
        setContentView(frame);
    }

    private LinearLayout bottomNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(6), dp(6), dp(6), dp(6));
        nav.setBackgroundColor(Color.WHITE);
        nav.setElevation(dp(10));
        nav.addView(navButton("Início", this::showHome), weight());
        nav.addView(navButton("Histórico", this::showHistory), weight());
        nav.addView(navButton("Aprender", this::showLearn), weight());
        nav.addView(navButton("Sobre", this::showAbout), weight());
        return nav;
    }

    private LinearLayout.LayoutParams weight() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
    }

    private Button navButton(String label, Runnable action) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(11);
        b.setTextColor(PRIMARY);
        b.setAllCaps(false);
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setOnClickListener(v -> action.run());
        return b;
    }

    private Button primaryButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(16);
        b.setTextColor(Color.WHITE);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setAllCaps(false);
        b.setBackgroundTintList(ColorStateList.valueOf(ACCENT));
        b.setMinHeight(dp(52));
        return b;
    }

    private Button secondaryButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(14);
        b.setTextColor(PRIMARY);
        b.setAllCaps(false);
        b.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(229, 241, 241)));
        b.setMinHeight(dp(48));
        return b;
    }

    private LinearLayout card() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(16), dp(16), dp(16), dp(16));
        c.setBackground(rounded(Color.WHITE, 16));
        c.setElevation(dp(1));
        return c;
    }

    private LinearLayout.LayoutParams cardParams() {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        p.bottomMargin = dp(12);
        return p;
    }

    private void showHome() {
        LinearLayout body = page("Detector de Golpes", "Verifique antes de pagar, clicar ou compartilhar dados.");

        LinearLayout hero = card();
        hero.setBackground(rounded(PRIMARY, 18));
        TextView badge = text("PROTEÇÃO DIGITAL", 12, Color.rgb(158, 224, 214), true);
        TextView h = text("Algo parece suspeito?", 24, Color.WHITE, true);
        TextView p = text("Cole a mensagem, link, chave PIX, oferta ou dados do perfil. A análise local procura padrões comuns de fraude e mostra o nível de risco.", 15, Color.rgb(226, 239, 238), false);
        LinearLayout.LayoutParams hp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hp.topMargin = dp(8);
        hero.addView(badge);
        hero.addView(h, hp);
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pp.topMargin = dp(8);
        pp.bottomMargin = dp(12);
        hero.addView(p, pp);
        Button check = primaryButton("Fazer uma análise");
        check.setOnClickListener(v -> showAnalyze("message"));
        hero.addView(check);
        body.addView(hero, cardParams());

        TextView quick = text("Verificações rápidas", 18, INK, true);
        LinearLayout.LayoutParams qp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        qp.topMargin = dp(8);
        qp.bottomMargin = dp(10);
        body.addView(quick, qp);

        String[][] items = {
                {"Mensagem suspeita", "WhatsApp, SMS, e-mail ou conversa", "message"},
                {"Link ou site", "URL de loja, login, rastreio ou promoção", "site"},
                {"PIX ou pagamento", "Chave, destinatário e contexto", "pix"},
                {"Oferta ou anúncio", "Preço, promessa e condições", "offer"},
                {"Documento ou foto", "Anexe o arquivo e descreva a origem", "document"},
                {"Perfil ou vendedor", "Conta, telefone, rede social e proposta", "profile"}
        };
        for (String[] item : items) {
            LinearLayout c = card();
            c.addView(text(item[0], 17, INK, true));
            TextView d = text(item[1], 14, MUTED, false);
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            dlp.topMargin = dp(4);
            dlp.bottomMargin = dp(8);
            c.addView(d, dlp);
            Button open = secondaryButton("Verificar");
            open.setOnClickListener(v -> showAnalyze(item[2]));
            c.addView(open);
            body.addView(c, cardParams());
        }

        LinearLayout local = card();
        local.addView(text("Privacidade por padrão", 17, PRIMARY, true));
        TextView localText = text("Nesta versão, a análise principal e o histórico funcionam no próprio aparelho. Nenhuma chave de IA fica embutida no APK e o conteúdo não precisa ser enviado a um servidor.", 14, MUTED, false);
        LinearLayout.LayoutParams ltp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ltp.topMargin = dp(6);
        local.addView(localText, ltp);
        body.addView(local, cardParams());
        render(body);
    }

    private int typeIndex(String id) {
        for (int i = 0; i < TYPE_IDS.length; i++) if (TYPE_IDS[i].equals(id)) return i;
        return 0;
    }

    private void showAnalyze(String initialType) {
        attachmentUri = null;
        attachmentName = null;
        LinearLayout body = page("Nova análise", "Escolha o tipo, informe o conteúdo e acrescente contexto. Quanto mais contexto, melhor a avaliação.");

        LinearLayout form = card();
        form.addView(text("Tipo de verificação", 14, INK, true));
        typeSpinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, TYPES);
        typeSpinner.setAdapter(adapter);
        typeSpinner.setSelection(typeIndex(initialType));
        LinearLayout.LayoutParams spinP = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        spinP.topMargin = dp(6);
        spinP.bottomMargin = dp(12);
        form.addView(typeSpinner, spinP);

        form.addView(text("O que você recebeu?", 14, INK, true));
        contentInput = new EditText(this);
        contentInput.setHint("Cole a mensagem, URL, chave PIX, descrição da oferta ou dados do perfil…");
        contentInput.setTextSize(15);
        contentInput.setTextColor(INK);
        contentInput.setHintTextColor(Color.rgb(126, 145, 149));
        contentInput.setGravity(Gravity.TOP | Gravity.START);
        contentInput.setPadding(dp(12), dp(12), dp(12), dp(12));
        contentInput.setBackground(rounded(Color.rgb(241, 245, 245), 12));
        LinearLayout.LayoutParams cip = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(150));
        cip.topMargin = dp(6);
        cip.bottomMargin = dp(12);
        form.addView(contentInput, cip);

        form.addView(text("Contexto opcional", 14, INK, true));
        contextInput = new EditText(this);
        contextInput.setHint("Quem enviou? Como chegou até você? O que estão pedindo?");
        contextInput.setTextSize(15);
        contextInput.setTextColor(INK);
        contextInput.setHintTextColor(Color.rgb(126, 145, 149));
        contextInput.setGravity(Gravity.TOP | Gravity.START);
        contextInput.setPadding(dp(12), dp(12), dp(12), dp(12));
        contextInput.setBackground(rounded(Color.rgb(241, 245, 245), 12));
        LinearLayout.LayoutParams ctxP = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(105));
        ctxP.topMargin = dp(6);
        ctxP.bottomMargin = dp(12);
        form.addView(contextInput, ctxP);

        form.addView(text("Anexo opcional", 14, INK, true));
        attachmentLabel = text("Nenhum arquivo selecionado", 13, MUTED, false);
        LinearLayout.LayoutParams alp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        alp.topMargin = dp(5);
        alp.bottomMargin = dp(8);
        form.addView(attachmentLabel, alp);
        Button attach = secondaryButton("Anexar imagem ou PDF");
        attach.setOnClickListener(v -> pickAttachment());
        form.addView(attach);

        TextView limitation = text("Importante: o modo local registra o arquivo e considera o contexto informado, mas não faz OCR nem leitura visual automática do conteúdo da imagem/PDF. Para esse tipo de arquivo, descreva o que aparece nele.", 12, MUTED, false);
        LinearLayout.LayoutParams limP = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        limP.topMargin = dp(8);
        limP.bottomMargin = dp(12);
        form.addView(limitation, limP);

        Button analyze = primaryButton("Analisar risco");
        analyze.setOnClickListener(v -> submitAnalysis());
        form.addView(analyze);
        body.addView(form, cardParams());
        render(body);
    }

    private void pickAttachment() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
        startActivityForResult(intent, PICK_ATTACHMENT);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_ATTACHMENT && resultCode == RESULT_OK && data != null && data.getData() != null) {
            attachmentUri = data.getData();
            attachmentName = resolveFileName(attachmentUri);
            if (attachmentLabel != null) attachmentLabel.setText("Selecionado: " + attachmentName);
        }
    }

    private String resolveFileName(Uri uri) {
        String name = "arquivo-anexado";
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = cursor.getString(idx);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return name;
    }

    private void submitAnalysis() {
        String content = contentInput == null ? "" : contentInput.getText().toString().trim();
        String context = contextInput == null ? "" : contextInput.getText().toString().trim();
        if (content.length() < 3 && attachmentName == null) {
            Toast.makeText(this, "Inclua uma mensagem, link, dado ou anexo para analisar.", Toast.LENGTH_LONG).show();
            return;
        }
        int position = typeSpinner == null ? 0 : typeSpinner.getSelectedItemPosition();
        String type = TYPE_IDS[Math.max(0, Math.min(position, TYPE_IDS.length - 1))];
        String effective = content.length() >= 3 ? content : "Arquivo anexado: " + attachmentName;
        lastReport = analyze(type, effective, context, attachmentName);
        saveHistory(lastReport, effective);
        showResult(lastReport);
    }

    private static class RiskReport {
        int score;
        String level;
        String type;
        String summary;
        final List<String> signals = new ArrayList<>();
        final List<String> recommendations = new ArrayList<>();
        final List<String> limitations = new ArrayList<>();
    }

    private void signal(RiskReport r, String title, String description, int weight) {
        r.signals.add(title + " — " + description);
        r.score += weight;
    }

    private boolean has(String text, String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(text).find();
    }

    private RiskReport analyze(String type, String content, String context, String fileName) {
        RiskReport r = new RiskReport();
        r.type = type;
        r.score = 5;
        String all = (content + "\n" + context).toLowerCase(Locale.ROOT);

        if (has(all, "\\b(urgente|agora|imediatamente|última chance|ultima chance|hoje ainda|em poucos minutos|prazo termina|não desligue|nao desligue)\\b"))
            signal(r, "Pressão de urgência", "A mensagem tenta reduzir o tempo disponível para você verificar a situação.", 20);
        if (has(all, "\\b(pix|transferência|transferencia|depósito|deposito|pagamento antecipado|taxa para liberar|sinal|boleto|gift card|cartão presente|cartao presente)\\b"))
            signal(r, "Pedido financeiro", "Há solicitação ou referência a pagamento. Confirme destinatário e motivo por um canal independente.", 18);
        if (has(all, "\\b(senha|token|código de verificação|codigo de verificacao|código sms|codigo sms|cvv|dados do cartão|dados do cartao|senha do banco)\\b"))
            signal(r, "Pedido de credencial", "Códigos, senhas e dados do cartão não devem ser compartilhados em contatos inesperados.", 28);
        if (has(all, "\\b(grátis|gratis|garantido|sem risco|retorno certo|lucro garantido|dobrar seu dinheiro|renda garantida|premiado|você ganhou|voce ganhou)\\b"))
            signal(r, "Promessa exagerada", "Promessas de ganho certo, prêmio ou benefício excepcional exigem verificação extra.", 17);
        if (has(all, "\\b(não conte|nao conte|segredo|não fale com|nao fale com|não ligue|nao ligue|não procure|nao procure)\\b"))
            signal(r, "Tentativa de isolamento", "Pedidos para não consultar outras pessoas ou canais oficiais são um sinal relevante de risco.", 24);
        if (has(all, "\\b(anydesk|teamviewer|supremo|acesso remoto|instale este aplicativo|compartilhe sua tela)\\b"))
            signal(r, "Acesso remoto", "Golpistas podem pedir instalação de aplicativos para controlar o aparelho ou visualizar dados bancários.", 30);
        if (has(all, "\\b(criptomoeda|bitcoin|usdt|forex|robô de investimento|robo de investimento|rentabilidade diária|rentabilidade diaria|investimento vip)\\b"))
            signal(r, "Investimento de alto risco", "A proposta envolve ativos ou linguagem frequentemente usada em fraudes de investimento.", 14);
        if (has(all, "\\b(banco|nubank|itaú|itau|bradesco|caixa|santander|inter)\\b") && has(all, "\\b(bloquead|suspens|regulariz|atualize|confirme|segurança|seguranca)\\b"))
            signal(r, "Possível falsa central", "Uso de nome de banco junto de bloqueio ou atualização pode indicar engenharia social. Abra o app oficial por conta própria.", 18);
        if (has(all, "\\b(mãe|mae|pai|filho|filha|troquei de número|troquei de numero|novo número|novo numero)\\b") && has(all, "\\b(pix|dinheiro|pagamento|transfer)\\b"))
            signal(r, "Possível golpe do novo número", "Confirme por ligação ou outro contato já conhecido antes de transferir dinheiro.", 25);
        if (has(all, "\\b(taxa de liberação|taxa de liberacao|taxa alfandegária|taxa alfandegaria|encomenda retida|entrega suspensa)\\b"))
            signal(r, "Cobrança para liberar entrega", "Mensagens de entrega com taxa inesperada são usadas para phishing e pagamentos indevidos.", 22);
        if (has(all, "\\b(vaga|emprego|trabalho remoto|home office)\\b") && has(all, "\\b(taxa|pague|curso obrigatório|curso obrigatorio|kit|pix)\\b"))
            signal(r, "Possível golpe de vaga", "Empregos legítimos normalmente não exigem PIX ou taxa antecipada para contratação.", 24);

        boolean urlFound = has(all, "https?://|www\\.");
        if (urlFound || "site".equals(type)) {
            if (has(all, "http://")) signal(r, "Link sem HTTPS", "O endereço usa HTTP. Isso não prova fraude, mas reduz uma proteção básica de transporte.", 10);
            if (has(all, "\\b(bit\\.ly|tinyurl\\.com|t\\.co|cutt\\.ly|is\\.gd|rebrand\\.ly|shorturl)\\b"))
                signal(r, "Link encurtado", "O destino real fica oculto até o redirecionamento. Verifique antes de abrir.", 15);
            if (has(all, "https?://[^\\s/]*@")) signal(r, "URL com @", "O caractere @ pode ser usado para disfarçar o domínio real em alguns links.", 22);
            if (has(all, "https?://(?:\\d{1,3}\\.){3}\\d{1,3}")) signal(r, "Site por endereço IP", "Serviços legítimos de consumo raramente pedem login em um endereço IP bruto.", 20);
            if (has(all, "xn--")) signal(r, "Domínio internacionalizado", "O domínio usa punycode. Pode ser legítimo, mas também pode imitar visualmente outro endereço.", 18);
            if (has(all, "\\.(top|xyz|click|buzz|vip|live|work|cam)(?:[/\\s:]|$)"))
                signal(r, "Domínio que merece cautela", "A extensão do domínio aparece com frequência em campanhas descartáveis; confirme a empresa por outro canal.", 10);
            if (has(all, "\\b(login|entrar|conta|senha|verificar|atualizar)\\b") && has(all, "https?://"))
                signal(r, "Link associado a login ou atualização", "Não use o link recebido para acessar contas. Digite o endereço oficial ou use o aplicativo conhecido.", 12);
        }

        if ("pix".equals(type) && !has(all, "pix|transfer|pagamento|chave|cpf|cnpj|telefone|email"))
            signal(r, "Poucos dados do pagamento", "Faltam informações para confirmar quem receberia o valor e por quê.", 8);
        if ("profile".equals(type) && has(all, "conta nova|perfil novo|sem avaliações|sem avaliacoes|poucos seguidores"))
            signal(r, "Perfil com pouca reputação", "Perfil recente ou sem histórico verificável exige validação adicional.", 15);
        if (("offer".equals(type) || "ad".equals(type)) && has(all, "metade do preço|metade do preco|90% off|80% off|barato demais|preço imperdível|preco imperdivel"))
            signal(r, "Preço fora do padrão", "Descontos extremos podem ser usados para induzir compra rápida em lojas falsas.", 18);

        if (fileName != null) {
            r.signals.add("Arquivo anexado — “" + fileName + "” foi registrado na análise.");
            r.limitations.add("O modo local desta versão não executa OCR nem visão computacional no anexo; a avaliação do arquivo depende da descrição digitada.");
        }

        if (r.signals.isEmpty()) {
            r.signals.add("Sem sinal textual forte — O conteúdo informado não ativou os principais padrões locais de risco.");
            r.score = 12;
        }

        r.score = Math.max(0, Math.min(100, r.score));
        if (r.score <= 24) r.level = "Muito baixo";
        else if (r.score <= 49) r.level = "Baixo";
        else if (r.score <= 69) r.level = "Moderado";
        else if (r.score <= 84) r.level = "Alto";
        else r.level = "Crítico";

        r.summary = "A análise local encontrou " + r.signals.size() + " ponto(s) relevante(s). O Safe Score de risco é " + r.score + "/100 (" + r.level.toLowerCase(Locale.ROOT) + "). Este resultado indica sinais de atenção, não uma confirmação jurídica de fraude.";
        r.recommendations.add("Confirme a identidade da pessoa ou empresa por um canal oficial e independente.");
        if (has(all, "pix|pagamento|transfer|boleto|depósito|deposito"))
            r.recommendations.add("Não pague antes de conferir nome do favorecido, motivo da cobrança e dados oficiais do recebedor.");
        if (urlFound) r.recommendations.add("Não abra o link recebido para fazer login. Digite o endereço oficial ou use o app da empresa.");
        r.recommendations.add("Nunca compartilhe senha, token, código SMS, CVV ou acesso remoto ao aparelho.");
        r.recommendations.add("Guarde capturas de tela, telefone, chave PIX, URL e comprovantes caso precise denunciar.");
        r.limitations.add("A análise é automatizada e baseada em padrões locais. Ela não garante que algo seja seguro nem confirma que seja golpe.");
        r.limitations.add("Esta versão não consulta bancos, Receita Federal, WHOIS, listas privadas de fraude ou reputação em tempo real.");
        return r;
    }

    private int riskColor(int score) {
        if (score <= 24) return SUCCESS;
        if (score <= 49) return Color.rgb(86, 156, 87);
        if (score <= 69) return WARNING;
        if (score <= 84) return Color.rgb(229, 111, 65);
        return DANGER;
    }

    private void showResult(RiskReport r) {
        LinearLayout body = page("Resultado da análise", "Safe Score: quanto maior a pontuação, maiores os sinais de atenção encontrados.");

        LinearLayout scoreCard = card();
        int rc = riskColor(r.score);
        TextView score = text(String.valueOf(r.score), 48, rc, true);
        score.setGravity(Gravity.CENTER);
        TextView of100 = text("/100", 16, MUTED, false);
        of100.setGravity(Gravity.CENTER);
        TextView level = text("Risco " + r.level, 20, rc, true);
        level.setGravity(Gravity.CENTER);
        scoreCard.addView(score);
        scoreCard.addView(of100);
        scoreCard.addView(level);
        TextView summary = text(r.summary, 14, MUTED, false);
        LinearLayout.LayoutParams sumP = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sumP.topMargin = dp(12);
        scoreCard.addView(summary, sumP);
        body.addView(scoreCard, cardParams());

        LinearLayout signals = card();
        signals.addView(text("Por que isso chama atenção", 18, INK, true));
        for (String s : r.signals) {
            TextView row = text("• " + s, 14, INK, false);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rp.topMargin = dp(10);
            signals.addView(row, rp);
        }
        body.addView(signals, cardParams());

        LinearLayout rec = card();
        rec.addView(text("O que fazer agora", 18, PRIMARY, true));
        for (String s : r.recommendations) {
            TextView row = text("✓ " + s, 14, INK, false);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rp.topMargin = dp(10);
            rec.addView(row, rp);
        }
        body.addView(rec, cardParams());

        LinearLayout limits = card();
        limits.addView(text("Limitações da análise", 16, INK, true));
        for (String s : r.limitations) {
            TextView row = text("• " + s, 12, MUTED, false);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rp.topMargin = dp(8);
            limits.addView(row, rp);
        }
        body.addView(limits, cardParams());

        Button share = secondaryButton("Compartilhar relatório");
        share.setOnClickListener(v -> shareReport(r));
        body.addView(share, cardParams());
        Button another = primaryButton("Fazer nova análise");
        another.setOnClickListener(v -> showAnalyze(r.type));
        body.addView(another, cardParams());
        render(body);
    }

    private void shareReport(RiskReport r) {
        StringBuilder sb = new StringBuilder();
        sb.append("Detector de Golpes\nSafe Score: ").append(r.score).append("/100 — Risco ").append(r.level).append("\n\n");
        sb.append(r.summary).append("\n\nSinais:\n");
        for (String s : r.signals) sb.append("• ").append(s).append("\n");
        sb.append("\nRecomendações:\n");
        for (String s : r.recommendations) sb.append("• ").append(s).append("\n");
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_TEXT, sb.toString());
        startActivity(Intent.createChooser(share, "Compartilhar análise"));
    }

    private void saveHistory(RiskReport r, String content) {
        try {
            JSONArray old = new JSONArray(prefs.getString("history", "[]"));
            JSONArray fresh = new JSONArray();
            JSONObject item = new JSONObject();
            item.put("date", new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(new Date()));
            item.put("type", r.type);
            item.put("score", r.score);
            item.put("level", r.level);
            item.put("summary", r.summary);
            String excerpt = content.replaceAll("\\s+", " ").trim();
            if (excerpt.length() > 140) excerpt = excerpt.substring(0, 140) + "…";
            item.put("excerpt", excerpt);
            fresh.put(item);
            for (int i = 0; i < old.length() && fresh.length() < 50; i++) fresh.put(old.get(i));
            prefs.edit().putString("history", fresh.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private void showHistory() {
        LinearLayout body = page("Histórico", "As últimas análises ficam salvas localmente neste aparelho.");
        try {
            JSONArray arr = new JSONArray(prefs.getString("history", "[]"));
            if (arr.length() == 0) {
                LinearLayout empty = card();
                empty.addView(text("Nenhuma análise ainda", 18, INK, true));
                TextView info = text("Faça sua primeira verificação para começar o histórico.", 14, MUTED, false);
                LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                ip.topMargin = dp(6);
                empty.addView(info, ip);
                Button go = primaryButton("Nova análise");
                LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                gp.topMargin = dp(12);
                empty.addView(go, gp);
                go.setOnClickListener(v -> showAnalyze("message"));
                body.addView(empty, cardParams());
            } else {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject item = arr.getJSONObject(i);
                    int score = item.optInt("score", 0);
                    LinearLayout c = card();
                    TextView top = text(item.optString("date") + "  •  " + typeLabel(item.optString("type")), 12, MUTED, false);
                    c.addView(top);
                    TextView risk = text(score + "/100 — Risco " + item.optString("level"), 19, riskColor(score), true);
                    LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    rp.topMargin = dp(6);
                    c.addView(risk, rp);
                    TextView excerpt = text(item.optString("excerpt"), 14, INK, false);
                    LinearLayout.LayoutParams ep = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    ep.topMargin = dp(7);
                    c.addView(excerpt, ep);
                    body.addView(c, cardParams());
                }
                Button clear = secondaryButton("Apagar histórico local");
                clear.setOnClickListener(v -> {
                    prefs.edit().remove("history").apply();
                    Toast.makeText(this, "Histórico apagado.", Toast.LENGTH_SHORT).show();
                    showHistory();
                });
                body.addView(clear, cardParams());
            }
        } catch (Exception e) {
            body.addView(text("Não foi possível carregar o histórico local.", 14, DANGER, false));
        }
        render(body);
    }

    private String typeLabel(String id) {
        for (int i = 0; i < TYPE_IDS.length; i++) if (TYPE_IDS[i].equals(id)) return TYPES[i];
        return "Análise";
    }

    private void showLearn() {
        LinearLayout body = page("Central Anti-Golpe", "Aprenda os sinais mais comuns e tire dúvidas rápidas sem sair do aplicativo.");
        String[][] tips = {
                {"Golpe do PIX", "Desconfie de urgência, troca de chave e pedido para pagar a pessoa diferente. Confira o nome do favorecido antes de confirmar."},
                {"Falsa central bancária", "Banco não precisa que você informe senha, token ou instale acesso remoto. Encerre o contato e ligue para o número oficial."},
                {"Phishing por link", "Não entre em conta bancária, marketplace ou e-mail pelo link recebido. Abra o app oficial ou digite o endereço por conta própria."},
                {"Loja falsa", "Preço muito abaixo do mercado, domínio estranho, poucas informações empresariais e PIX para pessoa física combinados aumentam o risco."},
                {"Golpe do novo número", "Se alguém disser que trocou de telefone e pedir dinheiro, confirme por chamada de voz ou outro contato já conhecido."},
                {"Vaga de emprego falsa", "Cuidado quando a suposta contratação exige taxa, curso pago obrigatório, compra de kit ou PIX antecipado."},
                {"Investimento milagroso", "Rentabilidade garantida, pressão para depositar mais e dificuldade de saque são sinais importantes de alerta."}
        };
        for (String[] tip : tips) {
            LinearLayout c = card();
            c.addView(text(tip[0], 17, PRIMARY, true));
            TextView d = text(tip[1], 14, MUTED, false);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            p.topMargin = dp(6);
            c.addView(d, p);
            body.addView(c, cardParams());
        }

        LinearLayout qa = card();
        qa.addView(text("Tire uma dúvida", 19, INK, true));
        TextView sub = text("Pergunte, por exemplo: “banco pode pedir token?”, “como conferir PIX?” ou “link encurtado é golpe?”.", 13, MUTED, false);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sp.topMargin = dp(5);
        sp.bottomMargin = dp(10);
        qa.addView(sub, sp);
        EditText question = new EditText(this);
        question.setHint("Digite sua dúvida sobre golpes…");
        question.setTextSize(15);
        question.setTextColor(INK);
        question.setPadding(dp(12), dp(10), dp(12), dp(10));
        question.setBackground(rounded(Color.rgb(241, 245, 245), 12));
        qa.addView(question, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));
        TextView answer = text("", 14, INK, false);
        Button ask = primaryButton("Responder dúvida");
        LinearLayout.LayoutParams ap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ap.topMargin = dp(10);
        ask.setOnClickListener(v -> {
            String q = question.getText().toString().trim();
            if (q.isEmpty()) {
                Toast.makeText(this, "Digite uma pergunta.", Toast.LENGTH_SHORT).show();
            } else {
                answer.setText(answerQuestion(q));
            }
        });
        qa.addView(ask, ap);
        LinearLayout.LayoutParams ansP = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ansP.topMargin = dp(12);
        qa.addView(answer, ansP);
        body.addView(qa, cardParams());
        render(body);
    }

    private String answerQuestion(String q) {
        String s = q.toLowerCase(Locale.ROOT);
        if (has(s, "token|senha|código|codigo|cvv")) return "Não compartilhe senha, token, código SMS ou CVV por telefone, WhatsApp, e-mail ou formulário recebido. Se alguém alegar ser do banco, encerre o contato e abra o aplicativo oficial ou ligue para um número verificado.";
        if (has(s, "pix|transfer")) return "Antes do PIX, confira o nome e CPF/CNPJ mostrados pelo seu banco, confirme o motivo da cobrança por outro canal e desconfie de urgência ou troca repentina de chave. Se já pagou e suspeita de fraude, contate seu banco imediatamente e pergunte sobre os mecanismos de contestação disponíveis.";
        if (has(s, "link|site|url|encurt")) return "Link encurtado não é automaticamente golpe, mas esconde o destino. Evite fazer login pelo link recebido. Procure o site oficial por conta própria, confira o domínio letra por letra e desconfie de endereços com erros, subdomínios confusos ou pedido de senha.";
        if (has(s, "banco|central|cartão|cartao")) return "Uma central legítima não precisa que você revele sua senha completa, token, CVV nem instale software de acesso remoto. Não confie apenas no número exibido na ligação; desligue e use um canal oficial.";
        if (has(s, "boleto")) return "Confira beneficiário, CNPJ/CPF, banco emissor e valor antes de pagar. Se o nome do favorecido não corresponde à empresa esperada, não conclua. Prefira gerar o boleto diretamente no site/app oficial.";
        if (has(s, "invest|cripto|bitcoin|usdt|renda")) return "Promessa de retorno garantido ou pressão para depositar rapidamente é sinal de alerta. Verifique quem oferece o investimento, como ocorre o saque, quais riscos são informados e nunca deposite apenas porque um grupo mostra supostos lucros.";
        if (has(s, "vaga|emprego|trabalho")) return "Desconfie de vaga que cobra taxa para contratar, exige compra de kit/curso antes de qualquer processo real ou pede documentos sensíveis cedo demais. Confirme a empresa e a vaga em canais oficiais.";
        if (has(s, "whatsapp|novo número|novo numero|filho|mãe|mae")) return "No golpe do novo número, o criminoso se passa por alguém conhecido e pede PIX. Confirme por ligação, vídeo ou outro número já salvo antes de pagar.";
        if (has(s, "loja|marketplace|produto|vendedor")) return "Verifique histórico do vendedor, avaliações consistentes, política de pagamento e se a plataforma oferece proteção. Evite sair do marketplace para pagar por PIX quando isso elimina a proteção da compra.";
        return "Para avaliar essa situação, procure quatro pontos: identidade verificável, pressão/urgência, pedido de dinheiro ou credenciais e possibilidade de confirmar tudo por um canal independente. Você também pode voltar à tela inicial e colar o conteúdo completo para gerar um Safe Score.";
    }

    private void showAbout() {
        LinearLayout body = page("Sobre o aplicativo", "Detector de Golpes 1.1.0 — edição standalone para Android.");
        LinearLayout c = card();
        c.addView(text("Check before you trust.", 22, PRIMARY, true));
        TextView p = text("O Detector de Golpes ajuda a identificar sinais comuns de engenharia social, phishing, falsa central, golpes de PIX, ofertas enganosas e outros padrões de fraude digital.", 14, MUTED, false);
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pp.topMargin = dp(8);
        c.addView(p, pp);
        body.addView(c, cardParams());

        LinearLayout privacy = card();
        privacy.addView(text("Como esta versão funciona", 17, INK, true));
        String[] points = {
                "Análise heurística executada localmente no aparelho.",
                "Histórico armazenado somente no armazenamento privado do app.",
                "Sem chave secreta de IA dentro do APK.",
                "Anexos podem ser selecionados, mas não são enviados nem lidos visualmente nesta edição.",
                "O resultado é orientativo e não substitui investigação, banco, polícia, advogado ou especialista em segurança."
        };
        for (String point : points) {
            TextView row = text("• " + point, 14, MUTED, false);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rp.topMargin = dp(8);
            privacy.addView(row, rp);
        }
        body.addView(privacy, cardParams());

        Button test = primaryButton("Testar com uma mensagem");
        test.setOnClickListener(v -> showAnalyze("message"));
        body.addView(test, cardParams());
        render(body);
    }
}
