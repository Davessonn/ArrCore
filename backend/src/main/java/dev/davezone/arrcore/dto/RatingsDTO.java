package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RatingsDTO {
    @JsonProperty("value")
    private double value;
    @JsonProperty("votes")
    private int votes;
}
