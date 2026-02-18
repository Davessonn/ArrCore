package dev.davezone.arrcore.service;

import lombok.Getter;

@Getter
public class ContainerResponse {
        private String Id;
        private String Names[];
        private String Image;
        private String ImageID;
        private String Command;
        private String Created;
        private String Ports[];
        private String Labels;
        private String State;
        private String Status;

        public ContainerResponse(String id, String[] names, String image, String imageID, String command, String created, String[] ports, String labels, String state, String status) {
            Id = id;
            Names = names;
            Image = image;
            ImageID = imageID;
            Command = command;
            Created = created;
            Ports = ports;
            Labels = labels;
            State = state;
            Status = status;
        }

}
