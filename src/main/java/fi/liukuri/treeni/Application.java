package fi.liukuri.treeni;

import com.vaadin.flow.component.page.AppShellConfigurator;
import com.vaadin.flow.component.page.Viewport;
import com.vaadin.flow.server.PWA;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Treeni Liukuri – Valmentajan ohjelma sisään, sarjat ulos.
 *
 * <p>The UI is a set of Hilla (React) client-side views. All training data lives in the browser
 * (localStorage), so the installed PWA keeps working offline at the gym; the Spring Boot server only
 * serves the static app shell. {@link PWA} generates the manifest + service worker that caches the
 * shell and the client-side views.
 */
@SpringBootApplication
@PWA(name = "Treeni Liukuri", shortName = "Treeni", description = "Valmentajan ohjelma sisään, sarjat ulos.",
        backgroundColor = "#F5F3EE", themeColor = "#2E6B5B", offlineResources = {"icons/icon.png"})
@Viewport("width=device-width, initial-scale=1, viewport-fit=cover")
public class Application implements AppShellConfigurator {

    /** Starts the Spring Boot app that serves the PWA shell. */
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
