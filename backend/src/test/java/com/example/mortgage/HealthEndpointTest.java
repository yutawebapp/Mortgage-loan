package com.example.mortgage;

import com.example.mortgage.product.ProductMapper;
import com.example.mortgage.taxdeduction.TaxDeductionMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Context-load and health check without Docker/Postgres: DB-related auto-configuration is excluded.
 * DB-backed integration tests (Testcontainers) will be added in later phases.
 */
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
                + "org.mybatis.spring.boot.autoconfigure.MybatisAutoConfiguration",
        "management.health.db.enabled=false"
})
@AutoConfigureMockMvc
class HealthEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    /** MyBatis is excluded above, so the product mapper bean needed by ProductService is stubbed. */
    @MockitoBean
    private ProductMapper productMapper;

    /** Same for the tax deduction mapper (TaxDeductionService needs it at context load). */
    @MockitoBean
    private TaxDeductionMapper taxDeductionMapper;

    @Test
    void actuatorHealthIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
