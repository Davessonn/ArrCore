package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TagDto {

    @JsonProperty("id")
    private Long id;
    @JsonProperty("label")
    private String label;
}
