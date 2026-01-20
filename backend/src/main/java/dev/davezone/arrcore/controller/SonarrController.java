package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import dev.davezone.arrcore.service.SonarrService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/sonarr")
public class SonarrController {

    private final SonarrService sonarrService;

    public SonarrController(SonarrService sonarrService) {
        this.sonarrService = sonarrService;
    }

    @GetMapping("/series")
    public Flux<SonarrSeriesDto> getAllSeries() {
        return sonarrService.getAllSeries();
    }

    @DeleteMapping("/series/{id}")
    public void deleteSeries(Long id) {
        sonarrService.deleteSeries(id);
    }
}
