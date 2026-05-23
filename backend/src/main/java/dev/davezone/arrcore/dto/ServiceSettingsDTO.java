package dev.davezone.arrcore.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceSettingsDTO {
    private String serviceName;
    private String url;
    private String apiKey;
    private String username;
    private String password;
    private boolean configured;
}
