import org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension

plugins {
    kotlin("jvm") version "2.4.10" apply false
    kotlin("plugin.serialization") version "2.4.10" apply false
}

val featurePrefix = ":features:"

subprojects {
    if (path == ":features") return@subprojects // the folder that holds features, not a module

    group = "dev.sand"
    version = "1.0.0"

    apply(plugin = "org.jetbrains.kotlin.jvm")
    repositories { mavenCentral() }
    extensions.configure<KotlinJvmProjectExtension> { jvmToolchain(21) }

    val isFeature = path.startsWith(featurePrefix)
    dependencies {
        "testImplementation"(kotlin("test"))
        "testImplementation"(platform("org.junit:junit-bom:6.1.3"))
        "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")

        // Rule 1: a feature folder needs no build file. These are its only dependencies.
        if (isFeature) {
            "implementation"(project(":dune"))
            "implementation"(project(":bank-api"))
        }
    }

    tasks.withType<Test>().configureEach { useJUnitPlatform() }
}

// Rule 2: forbidden dependencies fail mechanically, and the error names the supported path.
val checkedConfigurations = setOf("api", "implementation", "compileOnly", "runtimeOnly")

fun boundaryError(from: String, to: String, supportedPath: String): Nothing =
    throw GradleException("\n✗ $from depends on $to.\n  → $supportedPath\n  (See AGENTS.md, rule 2.)\n")

subprojects {
    afterEvaluate {
        configurations.filter { it.name in checkedConfigurations }.forEach { conf ->
            conf.dependencies.withType<ProjectDependency>().forEach { dep ->
                val to = dep.path
                when {
                    to == ":host-server" ->
                        boundaryError(path, to, ":host-server is a separate deployable. Reach it over HTTP through the BankHost contract.")
                    path == ":dune" ->
                        boundaryError(path, to, "The framework never imports application code. Put app types in :bank-api or :app.")
                    path == ":bank-api" && to != ":dune" ->
                        boundaryError(path, to, ":bank-api holds shared contracts only. It may use :dune and nothing else.")
                    path.startsWith(featurePrefix) && to.startsWith(featurePrefix) ->
                        boundaryError(path, to, "Features never import each other. Share state through :bank-api (StateKey, Command) and server calls through BankHost.")
                    path.startsWith(featurePrefix) && to == ":app" ->
                        boundaryError(path, to, "Features never import the app. Use what Context gives you: ctx.client and ctx.host<BankHost>().")
                    path == ":app" && to.startsWith(featurePrefix) && conf.name != "runtimeOnly" ->
                        boundaryError(path, to, ":app loads features at runtime only (runtimeOnly). Reach a feature through its Entrypoints, not its classes.")
                }
            }
        }
    }
}
