module.exports = {
    debug: true,
    service: {
        name: "Backup App",
        maintainer: {
            email: {
                enabled: false,
                host: "127.0.0.1",
                port: 0,
                secure: true,
                auth: {
                    user: "some_username",
                    pass: "some_password"
                }
            }
        }
    },
    backup: {
        schedule: "30 3 * * *",
        directories: [
            "./"
        ],
        targets: [
            {
                provider: "google",
                bucket: "some_bucket",
                json_path: "./google.json"
            }
        ],
    }
}