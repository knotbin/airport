{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        deno
        just
        gcc

        # Sharp dependencies
        vips
        pkg-config

        # SQLite dependencies
        sqlite
        # Build tools for native modules
        nodePackages.node-gyp
        gnumake

        # Standard C++ library and other common dependencies
        stdenv.cc.cc.lib

        nodejs
        yarn-berry
        git-lfs
      ];

      shellHook = ''
        if [ ! -f .env ]; then
          echo "COOKIE_SECRET=$(openssl rand -hex 32)" > .env
          echo ".env file created with COOKIE_SECRET"
        else
          echo ".env file already exists"
        fi
      '';
    };
  };
}
