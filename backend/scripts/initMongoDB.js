db.createRole({
    role: "eduGuideRole",
    privileges: [
        {
            resource: { db: "eduGuideDB", collection: "resources" },
            actions: [ "find", "insert", "update", "remove" ]
        },
        {
            resource: { db: "eduGuideDB", collection: "versions" },
            actions: [ "find", "insert", "update", "remove" ]
        }
    ],
    roles: []
});

db.createUser({
    user: "eduGuideApp",
    pwd: passwordPrompt(),
    roles: [
        { role: "eduGuideRole", db: "eduGuideDB" }
    ],
    authenticationRestrictions: [
        {
            clientSource: ["localhost", "127.0.0.1"],
            serverAddress: ["localhost", "127.0.0.1"]
        }
    ],
    mechanisms: ["SCRAM-SHA-256"]
});
