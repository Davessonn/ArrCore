package dev.davezone.arrcore.service;

import dev.davezone.arrcore.auth.AuthRequest;
import dev.davezone.arrcore.auth.AuthResponse;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class PortainerService {

    private static final String GET_JWT_API_PATH = "api/auth";
    private static final String GET_CONTAINERS_API_PATH = "api/endpoints/1/docker/containers/json";

    private String portainerUrl;
    private String portainerUsername;
    private String portainerPassword;

    private final WebClient webClient;

    public PortainerService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.portainerUrl = dotenv.get("PORTAINER_URL");
        this.portainerUsername = dotenv.get("PORTAINER_USERNAME");
        this.portainerPassword = dotenv.get("PORTAINER_PASSWORD");
        this.webClient = webClient;

    }

    public Flux<ContainerResponse> getContainers() {
        return authenticate()
                .flatMapMany(token -> fetchContainers(token));
    }

    private Mono<String> authenticate() {
        return webClient.post()
                .uri(portainerUrl + GET_JWT_API_PATH)
                .bodyValue(new AuthRequest(portainerUsername, portainerPassword))
                .retrieve()
                .bodyToMono(AuthResponse.class)
                .map(AuthResponse::getJwt);
    }

    private Flux<ContainerResponse> fetchContainers(String token) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(portainerUrl + GET_CONTAINERS_API_PATH)
                        .queryParam("all", "true")
                        .build())
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToFlux(ContainerResponse.class);
    }

}
