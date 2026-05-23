package dev.davezone.arrcore.service;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Service
public class PortainerService {

    private static final String GET_CONTAINERS_API_PATH = "api/endpoints/3/docker/containers/json";

    private final String portainerUrl;
    private final String portainerApiKey;

    private final WebClient webClient;

    public PortainerService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.portainerUrl = dotenv.get("PORTAINER_URL");
        this.portainerApiKey = dotenv.get("PORTAINER_API_KEY");
        this.webClient = webClient;

        if (this.portainerUrl == null || this.portainerApiKey == null) {
            throw new IllegalStateException("Missing required environment variables: PORTAINER_URL and PORTAINER_API_KEY must be set.");
        }
    }

    public Flux<ContainerResponse> getContainers() {
        return webClient.get()
                .uri(portainerUrl + GET_CONTAINERS_API_PATH + "?all=true")
                .header("X-API-Key", portainerApiKey)
                .retrieve()
                .bodyToFlux(ContainerResponse.class);
    }
}
