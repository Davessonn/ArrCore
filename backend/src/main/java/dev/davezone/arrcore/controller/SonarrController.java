package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import dev.davezone.arrcore.service.SonarrService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

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
    public void deleteSeries(Long id) {
        sonarrService.deleteSeries(id);
    }

    @GetMapping("/series/{id}")
    public Flux<SonarrSeriesDto> getSeriesById(Long id) {
        return sonarrService.getSeriesById(id);
    }
}
