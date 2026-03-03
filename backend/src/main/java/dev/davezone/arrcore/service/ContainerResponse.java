package dev.davezone.arrcore.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
public class ContainerResponse {
    @JsonProperty("Id")
    private final String id;

    @JsonProperty("Names")
    private final List<String> names;

    @JsonProperty("Image")
    private final String image;

    @JsonProperty("ImageID")
    private final String imageId;

    @JsonProperty("Command")
    private final String command;

    @JsonProperty("Created")
    private final Long created;

    @JsonProperty("State")
    private final String state;

    @JsonProperty("Status")
    private final String status;

    @JsonProperty("Labels")
    private final Map<String, String> labels;

    public ContainerResponse(String id, List<String> names, String image, String imageId, String command, Long created, String state, String status, Map<String, String> labels) {
        this.id = id;
        this.names = names;
        this.image = image;
        this.imageId = imageId;
        this.command = command;
        this.created = created;
        this.state = state;
        this.status = status;
        this.labels = labels;
    }
}
