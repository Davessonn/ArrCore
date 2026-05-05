package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import dev.davezone.arrcore.service.SonarrService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/sonarr")
@AllArgsConstructor
public class SonarrController {

    private final SonarrService sonarrService;


    @GetMapping("/series")
    public Flux<SonarrSeriesDto> getAllSeries() {
        return sonarrService.getAllSeries();
    }

    @DeleteMapping("/series/{id}")
    public Mono<Void> deleteSeries(@PathVariable Long id) {
        return sonarrService.deleteSeries(id);
    }

    @GetMapping("/series/{id}")
    public Flux<SonarrSeriesDto> getSeriesById(@PathVariable Long id) {
        return sonarrService.getSeriesById(id);
    }

    @PutMapping("/series/{id}")
    public Mono<Map<String, Object>> updateSeries(@PathVariable Long id, @RequestBody Map<String, Object> series) {
        return sonarrService.updateSeries(id, series);
    }
}
