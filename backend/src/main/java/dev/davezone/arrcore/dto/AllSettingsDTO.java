package dev.davezone.arrcore.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AllSettingsDTO {
    private Map<String, ServiceSettingsDTO> services;
}
