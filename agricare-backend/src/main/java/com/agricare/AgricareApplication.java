package com.agricare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AgricareApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgricareApplication.class, args);
    }
}
