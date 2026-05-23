package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.AllSettingsDTO;
import dev.davezone.arrcore.dto.ServiceSettingsDTO;
import dev.davezone.arrcore.service.SettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Mono<AllSettingsDTO> getAllSettings() {
        return settingsService.getAllSettings();
    }

    @PutMapping
    public Mono<AllSettingsDTO> updateAllSettings(@RequestBody AllSettingsDTO dto) {
        return settingsService.saveAllSettings(dto);
    }

    @PutMapping("/{serviceName}")
    public Mono<ServiceSettingsDTO> updateServiceSettings(
            @PathVariable String serviceName,
            @RequestBody ServiceSettingsDTO dto) {
        return settingsService.saveServiceSettings(serviceName, dto);
    }

    @PostMapping("/test/{serviceName}")
    public Mono<ResponseEntity<Map<String, Object>>> testConnection(
            @PathVariable String serviceName,
            @RequestBody(required = false) ServiceSettingsDTO dto) {
        Mono<Boolean> result = dto == null
                ? settingsService.testConnection(serviceName)
                : settingsService.testAndSave(serviceName, dto);

        return result.map(ok -> {
            if (ok) {
                return ResponseEntity.ok(Map.<String, Object>of("success", true, "message", "Service is configured"));
            }
            return ResponseEntity.ok(Map.<String, Object>of("success", false, "message", "Service is not configured"));
        });
    }
}
