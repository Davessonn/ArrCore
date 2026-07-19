package dev.davezone.arrcore.service;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class GrafanaService {

    private static final String SERVICE_NAME = "grafana";

    private final SettingsService settingsService;

    public GrafanaService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    //Get the Grafana URL from the settings service
    public Mono<String> getGrafanaDashboard() {
        return settingsService.getDecryptedUrl(SERVICE_NAME);
    }
}
