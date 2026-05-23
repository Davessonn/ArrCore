package dev.davezone.arrcore.config;

import dev.davezone.arrcore.service.SettingsService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SettingsInitializer {

    private final SettingsService settingsService;

    public SettingsInitializer(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedSettings() {
        settingsService.seedFromEnvIfEmpty().subscribe();
    }
}
