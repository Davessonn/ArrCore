package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.service.PortainerService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portainer")
@AllArgsConstructor
public class PortainerController {

    private final PortainerService portainerService;

    @GetMapping("/containers")
    public Object getContainers() {
        return portainerService.getContainers();
    }
}
