package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SonarrRatingsDTO {
    @JsonProperty("value")
    private double value;
    @JsonProperty("votes")
    private int votes;
}
