package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.service.GrafanaService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/grafana")
@AllArgsConstructor
public class GrafanaController {

    private final GrafanaService grafanaService;

    @GetMapping("/dashboard")
    public Mono<String> getGrafanaDashboard() {
        return grafanaService.getGrafanaDashboard();
    }
}
