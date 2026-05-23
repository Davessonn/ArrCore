package dev.davezone.arrcore.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class PortainerService {

    private static final String SERVICE_NAME = "portainer";
    private static final String GET_CONTAINERS_API_PATH = "api/endpoints/3/docker/containers/json";

    private final WebClient webClient;
    private final SettingsService settingsService;

    public PortainerService(WebClient webClient, SettingsService settingsService) {
        this.webClient = webClient;
        this.settingsService = settingsService;
    }

    private Mono<String[]> getCredentials() {
        return Mono.zip(
                settingsService.getDecryptedUrl(SERVICE_NAME),
                settingsService.getDecryptedApiKey(SERVICE_NAME)
        ).map(tuple -> new String[]{tuple.getT1(), tuple.getT2()});
    }

    public Flux<ContainerResponse> getContainers() {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + GET_CONTAINERS_API_PATH + "?all=true")
                        .header("X-API-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(ContainerResponse.class)
        );
    }
}
