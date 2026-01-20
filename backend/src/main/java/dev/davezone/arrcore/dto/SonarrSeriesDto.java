package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SonarrSeriesDto {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("title")
    private String title;
    @JsonProperty("status")
    private String status;
    @JsonProperty("rootFolderPath")
    private String path;
}
