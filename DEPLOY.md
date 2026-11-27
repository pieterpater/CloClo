# Putting CloClo on an Ubuntu VPS

This runs one Node process (the site plus the live world) as a systemd service, with Caddy in front for HTTPS. The commands are for Ubuntu 22.04 or 24.04; run them as a user with `sudo`.

## 1. Install Node.js 22, git and Caddy

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v22.x

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 2. Get the code and build it

```bash
sudo useradd --system --home /opt/cloclo --shell /usr/sbin/nologin cloclo
sudo git clone https://github.com/pieterpater/cloclo.git /opt/cloclo
cd /opt/cloclo
sudo git checkout main            # or the branch you want to run
sudo npm ci
sudo npm run build
sudo chown -R cloclo:cloclo /opt/cloclo
```

The repository is private, so `git clone` asks for a login. Use a GitHub personal access token (with read access to this repository) as the password, or add a read-only deploy key to the repository.

## 3. Settings and the API key

```bash
sudo tee /etc/cloclo.env > /dev/null <<'EOF'
ANTHROPIC_API_KEY=sk-ant-your-key-here
HOST=127.0.0.1
PORT=8080
EOF
sudo chmod 600 /etc/cloclo.env
```

Optional settings for the same file: `SIM_SPEED`, `BRAIN_MAX_PER_MINUTE`, `BRAIN_MAX_PER_DAY`, `BRAIN_WHEN_EMPTY` (see README.md). Leave out `ANTHROPIC_API_KEY` to run CloClo on his rules, for free.

## 4. Start CloClo

```bash
sudo cp /opt/cloclo/deploy/cloclo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloclo
systemctl status cloclo            # should say "active (running)"
curl -s localhost:8080/api/brain   # {"brain":"claude-haiku-5-5", ...}
```

## 5. HTTPS with your domain

Point your domain (or a subdomain) to the VPS with an `A` record for its IP address. Then:

```bash
sudo cp /opt/cloclo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # replace cloclo.example.com with your domain
sudo systemctl reload caddy

sudo ufw allow OpenSSH
sudo ufw allow 443/tcp
sudo ufw enable
```

Caddy gets a certificate by itself and renews it. Open `https://your-domain` and CloClo is live.

The site is HTTPS-only: Caddy doesn't listen on port 80 at all, gets its certificate over port 443, and tells browsers (HSTS) to always use HTTPS for the domain. Only port 443 has to be open, also in your provider's firewall. Someone who types `http://` gets no answer the first time; browsers that have visited once go to `https://` by themselves. To get a redirect from `http://` to `https://` back, remove the `auto_https disable_redirects` block at the top of the Caddyfile and open port 80.

**IPv6-only VPS?** HTTPS works the same way: give your domain an `AAAA` record (the IPv6 version of an `A` record) instead of an `A` record; Let's Encrypt validates over IPv6 too. A free dynamic-DNS name that supports `AAAA` records works as well.

**No domain, but no `:8080` in the address either?** Keep `HOST=127.0.0.1` and let Caddy serve plain HTTP on port 80 (browsers will show "Not secure"):

```
:80 {
	@notstream not path /api/stream
	encode @notstream gzip
	reverse_proxy 127.0.0.1:8080
}
```

Open `http://[your-ipv6-address]/`.

**Or straight to port 8080 on IPv6:** set `HOST=::` in `/etc/cloclo.env` (listens on IPv6, and IPv4 where there is any) and open `http://[your-ipv6-address]:8080`; only visitors with IPv6 can reach it. For everyone, `cloudflared tunnel --url http://localhost:8080` gives a temporary public `https://…trycloudflare.com` address without a domain. Note that GitHub has no IPv6 (copy the code over with `scp` instead of `git clone`), and check that `curl -6 -sI https://api.anthropic.com` answers, or CloClo will use his rules.

No domain? Skip step 5, set `HOST=0.0.0.0` in `/etc/cloclo.env`, run `sudo systemctl restart cloclo` and `sudo ufw allow 8080/tcp`, and open `http://your-vps-ip:8080`.

## Everyday use

```bash
journalctl -u cloclo -f            # live log: every decision with its cost
curl -s localhost:8080/api/brain   # viewers, decisions today, total cost since the last start

# update to the latest code
cd /opt/cloclo
sudo git pull
sudo npm ci && sudo npm run build
sudo chown -R cloclo:cloclo /opt/cloclo
sudo systemctl restart cloclo      # CloClo continues where he was
```

CloClo's world is saved in `/var/lib/cloclo/world.json`. Delete that file (with the service stopped) to give him a fresh start.
