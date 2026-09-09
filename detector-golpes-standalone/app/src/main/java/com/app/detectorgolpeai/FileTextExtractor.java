package com.app.detectorgolpeai;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.IOException;

public final class FileTextExtractor {
    private static final int MAX_PDF_PAGES = 5;
    private static final int MAX_RENDER_SIDE = 1800;

    public interface Callback {
        void onSuccess(String extractedText, int pagesProcessed, boolean partial);
        void onError(String message);
    }

    private FileTextExtractor() {}

    public static void extract(Activity activity, Uri uri, String mime, Callback callback) {
        if (mime != null && mime.equalsIgnoreCase("application/pdf")) {
            extractPdf(activity, uri, callback);
        } else {
            extractImage(activity, uri, callback);
        }
    }

    private static void extractImage(Activity activity, Uri uri, Callback callback) {
        final TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        try {
            InputImage image = InputImage.fromFilePath(activity, uri);
            recognizer.process(image)
                    .addOnSuccessListener(result -> {
                        recognizer.close();
                        callback.onSuccess(result.getText(), 1, false);
                    })
                    .addOnFailureListener(error -> {
                        recognizer.close();
                        callback.onError("Não foi possível ler o texto da imagem. Você ainda pode descrevê-la manualmente.");
                    });
        } catch (IOException error) {
            recognizer.close();
            callback.onError("Não foi possível abrir a imagem selecionada.");
        }
    }

    private static void extractPdf(Activity activity, Uri uri, Callback callback) {
        final ParcelFileDescriptor descriptor;
        final PdfRenderer renderer;
        try {
            descriptor = activity.getContentResolver().openFileDescriptor(uri, "r");
            if (descriptor == null) {
                callback.onError("Não foi possível abrir o PDF.");
                return;
            }
            renderer = new PdfRenderer(descriptor);
        } catch (Exception error) {
            callback.onError("Não foi possível abrir o PDF selecionado.");
            return;
        }

        int totalPages = renderer.getPageCount();
        if (totalPages <= 0) {
            closeQuietly(renderer, descriptor);
            callback.onError("O PDF não possui páginas legíveis.");
            return;
        }

        int pagesToRead = Math.min(totalPages, MAX_PDF_PAGES);
        TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        StringBuilder output = new StringBuilder();
        processPdfPage(renderer, descriptor, recognizer, 0, pagesToRead, totalPages, output, callback);
    }

    private static void processPdfPage(
            PdfRenderer renderer,
            ParcelFileDescriptor descriptor,
            TextRecognizer recognizer,
            int index,
            int pagesToRead,
            int totalPages,
            StringBuilder output,
            Callback callback
    ) {
        if (index >= pagesToRead) {
            recognizer.close();
            closeQuietly(renderer, descriptor);
            callback.onSuccess(output.toString().trim(), pagesToRead, totalPages > pagesToRead);
            return;
        }

        PdfRenderer.Page page = null;
        Bitmap bitmap = null;
        try {
            page = renderer.openPage(index);
            int originalW = Math.max(1, page.getWidth());
            int originalH = Math.max(1, page.getHeight());
            float scale = Math.min(2.0f, MAX_RENDER_SIDE / (float) Math.max(originalW, originalH));
            scale = Math.max(1.0f, scale);
            int width = Math.max(1, Math.round(originalW * scale));
            int height = Math.max(1, Math.round(originalH * scale));
            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            bitmap.eraseColor(Color.WHITE);
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
            page.close();
            page = null;

            final Bitmap finalBitmap = bitmap;
            InputImage image = InputImage.fromBitmap(finalBitmap, 0);
            recognizer.process(image)
                    .addOnSuccessListener(result -> {
                        if (output.length() > 0) output.append("\n\n");
                        output.append("[Página ").append(index + 1).append("]\n").append(result.getText());
                        finalBitmap.recycle();
                        processPdfPage(renderer, descriptor, recognizer, index + 1, pagesToRead, totalPages, output, callback);
                    })
                    .addOnFailureListener(error -> {
                        finalBitmap.recycle();
                        if (output.length() > 0) output.append("\n\n");
                        output.append("[Página ").append(index + 1).append(": OCR indisponível]");
                        processPdfPage(renderer, descriptor, recognizer, index + 1, pagesToRead, totalPages, output, callback);
                    });
        } catch (Exception error) {
            if (page != null) {
                try { page.close(); } catch (Exception ignored) {}
            }
            if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
            recognizer.close();
            closeQuietly(renderer, descriptor);
            callback.onError("Falha ao processar o PDF. Tente outro arquivo ou descreva o conteúdo manualmente.");
        }
    }

    private static void closeQuietly(PdfRenderer renderer, ParcelFileDescriptor descriptor) {
        try { renderer.close(); } catch (Exception ignored) {}
        try { descriptor.close(); } catch (Exception ignored) {}
    }
}
