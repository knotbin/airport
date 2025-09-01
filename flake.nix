{
  description = "Deno Javascript App";

  inputs = {
    utils.url = "github:numtide/flake-utils";
    deno2nix = {
      url = "github:SnO2WMaN/deno2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    utils,
    deno2nix,
  }:
    utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [deno2nix.overlays.default];
      };
    in rec {
      apps.default = utils.lib.mkApp {
        drv = packages.default;
      };

      packages.default = pkgs.deno2nix.mkExecutable {
        pname = "template";
        version = "0.1.0";

        src = ./.;
        lockfile = "./deno.lock";
        config = "./deno.json";
        entrypoint = "./dev.ts";
        
        buildInputs = with pkgs; [
          vips
          pkg-config
          stdenv.cc.cc.lib
          glib
          cairo
          pango
          libjpeg
          giflib
          librsvg
          python3
          nodejs
          yarn
        ];
      };

      devShell = pkgs.mkShell {
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
          yarn
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
    });
}
