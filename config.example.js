module.exports = {
    debug: true,
    service: {
        name: "Backup App",
        maintainer: {
            name: "TEMP NAME",
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
        storage: "google",
        schedule: "30 3 * * *",
        directories: [
            "./"
        ]
    },
    google: {
        bucket: "some_bucket"
    }
}