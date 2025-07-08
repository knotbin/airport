# Airport

Your terminal for seamless AT Protocol PDS (Personal Data Server) migration and backup.

Airport is a web application built with Fresh and Deno that helps users safely migrate and backup their Bluesky PDS data. It provides a user-friendly interface for managing your AT Protocol data.

⚠️ **Alpha Status**: Airport is currently in alpha. Please use migration tools at your own risk and avoid using with main accounts during this phase.

## Features

- PDS migration between servers
- Data backup functionality
- User-friendly interface
- Coming soon: PLC Key retrieval, data backup

## Technology Stack

- [Fresh](https://fresh.deno.dev/) - The next-gen web framework
- [Deno](https://deno.com/) - A modern runtime for JavaScript and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) - For styling
- AT Protocol Integration

## Getting Started

### Prerequisites

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

### Development

Start the project in development mode:

```shell
deno task dev
```

This will watch the project directory and restart as necessary.

## About

Airport is developed with ❤️ by [Roscoe](https://bsky.app/profile/knotbin.com) for [Spark](https://sprk.so), a new short-video platform for AT Protocol.

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. Please only submit pull requests that are relevant to the project. This project targets people with a non-advanced understanding of AT Protocol, so please avoid submitting pull requests that add features that complicate the user experience.

## License

[MIT License](LICENSE)
