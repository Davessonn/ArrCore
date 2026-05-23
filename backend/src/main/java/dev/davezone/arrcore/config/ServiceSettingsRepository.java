package dev.davezone.arrcore.config;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface ServiceSettingsRepository extends ReactiveCrudRepository<ServiceSettings, Long> {
    Mono<ServiceSettings> findByServiceName(String serviceName);
}
