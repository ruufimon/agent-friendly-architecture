package dev.sand.host

import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HostApiTest {
    private val transfer25k = """{"to":"Somsri K. ••7730","amount":25000}"""

    @Test
    fun `fraud score flags a large transfer to a new recipient`() = testApplication {
        application { hostModule() }
        val response = client.post("/host/v1/fraud-score") {
            bearerAuth("demo")
            contentType(ContentType.Application.Json)
            setBody(transfer25k)
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(""""score":85""" in body, body)
        assertTrue(""""level":"HIGH"""" in body, body)
    }

    @Test
    fun `missing token returns a problem with a supported path`() = testApplication {
        application { hostModule() }
        val response = client.get("/host/v1/loan-eligibility")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
        assertEquals("application/problem+json", response.headers["Content-Type"]?.substringBefore(";"))
        assertTrue("supportedPath" in response.bodyAsText())
    }

    @Test
    fun `transfer is idempotent and updates eligibility`() = testApplication {
        application { hostModule() }
        suspend fun send(key: String, body: String) = client.post("/host/v1/transfers") {
            bearerAuth("demo")
            header("Idempotency-Key", key)
            contentType(ContentType.Application.Json)
            setBody(body)
        }

        val first = send("key-00000001", transfer25k)
        assertEquals(HttpStatusCode.Created, first.status)
        assertTrue(""""newBalance":27300""" in first.bodyAsText())

        val retry = send("key-00000001", transfer25k)
        assertEquals(first.bodyAsText(), retry.bodyAsText(), "a retry must not send money twice")

        val reused = send("key-00000001", """{"to":"Somsri K. ••7730","amount":100}""")
        assertEquals(HttpStatusCode.Conflict, reused.status)

        val eligibility = client.get("/host/v1/loan-eligibility") { bearerAuth("demo") }
        assertTrue(""""eligible":false""" in eligibility.bodyAsText())
    }

    @Test
    fun `business rules and bad input return problems`() = testApplication {
        application { hostModule() }
        val tooMuch = client.post("/host/v1/transfers") {
            bearerAuth("demo")
            header("Idempotency-Key", "key-00000002")
            contentType(ContentType.Application.Json)
            setBody("""{"to":"Somsri K. ••7730","amount":60000}""")
        }
        assertEquals(HttpStatusCode.UnprocessableEntity, tooMuch.status)

        val noKey = client.post("/host/v1/transfers") {
            bearerAuth("demo")
            contentType(ContentType.Application.Json)
            setBody(transfer25k)
        }
        assertEquals(HttpStatusCode.BadRequest, noKey.status)

        val zero = client.post("/host/v1/fraud-score") {
            bearerAuth("demo")
            contentType(ContentType.Application.Json)
            setBody("""{"to":"Somsri K. ••7730","amount":0}""")
        }
        assertEquals(HttpStatusCode.BadRequest, zero.status)
    }
}
