rootProject.name = "agent-friendly-architecture"

include("dune", "bank-api", "app", "host-server")

// Rule 4: every folder under features/ is a feature module.
// Adding a feature never means editing this file.
rootDir.resolve("features")
    .listFiles { file -> file.isDirectory && file.resolve("src").isDirectory }
    ?.sortedBy { it.name }
    ?.forEach { include(":features:${it.name}") }
