package dev.davezone.arrcore.config;

import lombok.Data;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDateTime;

@Data
@Table("service_settings")
public class ServiceSettings {

    @Id
    private Long id;

    @Column("service_name")
    private String serviceName;

    private String url;

    @Column("api_key")
    private String apiKey;

    private String username;

    private String password;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Column("updated_at")
    private LocalDateTime updatedAt;
}
