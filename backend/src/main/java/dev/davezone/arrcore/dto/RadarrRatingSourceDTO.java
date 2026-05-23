package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RadarrRatingSourceDTO {
    @JsonProperty("votes")
    private int votes;
    @JsonProperty("value")
    private double value;
    @JsonProperty("type")
    private String type;
}

