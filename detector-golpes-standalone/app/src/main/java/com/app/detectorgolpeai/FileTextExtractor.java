package com.app.detectorgolpeai;

import android.app.Activity;
import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class FileTextExtractor {
    private static final int MAX_PDF_PAGES = 5;
    private static final int MAX_RENDER_SIDE = 1800;
    private static final long MAX_FILE_BYTES = 12L * 1024L * 1024L;
    private static final int MAX_IMAGE_SIDE = 8000;
    private static final long MAX_IMAGE_PIXELS = 32_000_000L;

    public interface Callback {
        void onSuccess(String extractedText, int pagesProcessed, boolean partial);
        void onError(String message);
    }

    private FileTextExtractor() {}

    public static void extract(Activity activity, Uri uri, String mime, Callback callback) {
        if (uri == null) {
            callback.onError("Selecione um arquivo válido.");
            return;
        }

        final ContentResolver resolver = activity.getContentResolver();
        final String resolvedMime = resolver.getType(uri);
        final boolean requestedPdf = "application/pdf".equalsIgnoreCase(mime);
        final boolean resolvedPdf = "application/pdf".equalsIgnoreCase(resolvedMime);
        final boolean resolvedImage = resolvedMime != null && resolvedMime.toLowerCase().startsWith("image/");

        if (resolvedMime != null && !resolvedMime.equalsIgnoreCase("application/octet-stream") && !resolvedPdf && !resolvedImage) {
            callback.onError("Formato não permitido. Envie uma imagem ou PDF.");
            return;
        }

        String sizeError = validateFileSize(resolver, uri);
        if (sizeError != null) {
            callback.onError(sizeError);
            return;
        }

        if (requestedPdf || resolvedPdf) {
            if (!hasPdfSignature(resolver, uri)) {
                callback.onError("O arquivo não parece ser um PDF válido.");
                return;
            }
            extractPdf(activity, uri, callback);
            return;
        }

        String imageError = validateImageBounds(resolver, uri);
        if (imageError != null) {
            callback.onError(imageError);
            return;
        }
        extractImage(activity, uri, callback);
    }

    private static String validateFileSize(ContentResolver resolver, Uri uri) {
        long size = -1L;
        ParcelFileDescriptor descriptor = null;
        try {
            descriptor = resolver.openFileDescriptor(uri, "r");
            if (descriptor != null) size = descriptor.getStatSize();
        } catch (Exception ignored) {
        } finally {
            if (descriptor != null) {
                try { descriptor.close(); } catch (Exception ignored) {}
            }
        }

        if (size > MAX_FILE_BYTES) {
            return "Arquivo muito grande. O limite é 12 MB.";
        }
        if (size >= 0) return null;

        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) return "Não foi possível abrir o arquivo selecionado.";
            byte[] buffer = new byte[32 * 1024];
            long total = 0L;
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > MAX_FILE_BYTES) return "Arquivo muito grande. O limite é 12 MB.";
            }
            return null;
        } catch (IOException error) {
            return "Não foi possível validar o tamanho do arquivo.";
        }
    }

    private static boolean hasPdfSignature(ContentResolver resolver, Uri uri) {
        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) return false;
            byte[] header = new byte[5];
            int read = input.read(header);
            return read == 5 && "%PDF-".equals(new String(header, StandardCharsets.US_ASCII));
        } catch (Exception error) {
            return false;
        }
    }

    private static String validateImageBounds(ContentResolver resolver, Uri uri) {
        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) return "Não foi possível abrir a imagem selecionada.";
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeStream(input, null, options);
            int width = options.outWidth;
            int height = options.outHeight;
            if (width <= 0 || height <= 0) return "O arquivo não parece ser uma imagem válida.";
            if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE || (long) width * (long) height > MAX_IMAGE_PIXELS) {
                return "Imagem com dimensões muito grandes. Reduza a resolução e tente novamente.";
            }
            return null;
        } catch (OutOfMemoryError error) {
            return "A imagem exige memória demais para ser processada com segurança.";
        } catch (Exception error) {
            return "Não foi possível validar a imagem selecionada.";
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
        } catch (OutOfMemoryError error) {
            recognizer.close();
            callback.onError("A imagem exige memória demais para ser processada com segurança.");
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
        } catch (OutOfMemoryError error) {
            callback.onError("O PDF exige memória demais para ser processado com segurança.");
            return;
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
        } catch (OutOfMemoryError error) {
            if (page != null) {
                try { page.close(); } catch (Exception ignored) {}
            }
            if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
            recognizer.close();
            closeQuietly(renderer, descriptor);
            callback.onError("O PDF exige memória demais para ser processado com segurança.");
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
