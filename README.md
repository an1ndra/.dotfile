I like to try different type of linux OS so i can't stick in one linux distro.Thats why i decided to make script that will help me to setup my linux desktop enviroment. I will update this as my requirements. Thanks 🙏

# Install vlc vim git gimp telegram virtualbox code 🤖
```bash
sudo apt-get install vlc nvim git gimp telegram virtualbox htop xfce4-terminal openjdk-11-jdk-headless neofetch curl wget tmux -y
```
# Download android-studio
```bash
sudo add-apt-repository ppa:maarten-fonville/android-studio -y
sudo apt update
sudo apt install android-studio
```

# Download Intellij
```bash
sudo add-apt-repository ppa:mmk2410/intellij-idea -y
sudo apt update
sudo apt install intellij-idea-community
```

# Download Brave browser
```bash
sudo apt install apt-transport-https curl
sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg arch=amd64] https://brave-browser-apt-release.s3.brave.com/ stable main"|sudo tee /etc/apt/sources.list.d/brave-browser-release.list
sudo apt update
sudo apt install brave-browser
```

# Download discord
```bash
wget -O discord.deb https://discord.com/api/download?platform=linux&format=deb
sudo apt install ./discord.deb
```

# Download obsidian
```bash
wget -O obsidian.deb https://github.com/obsidianmd/obsidian-releases/releases/download/v0.12.15/obsidian_0.12.15_amd64.deb
sudo apt install ./obsidian.deb
```

# ownload spotify
```bash
curl -sS https://download.spotify.com/debian/pubkey_0D811D58.gpg | sudo apt-key add - 
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list
sudo apt-get update && sudo apt-get install spotify-client
```

# Download publii
```bash
wget -O publii.deb https://cdn.getpublii.com/Publii-0.38.3.deb
sudo apt install ./publii.deb
```

# Download vscode
```bas
sudo apt install software-properties-common apt-transport-https
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

# Download drawio 
```bash
wget -O drawio.deb https://github.com/jgraph/drawio-desktop/releases/download/v15.4.0/drawio-amd64-15.4.0.deb
sudo apt install ./drawio.deb
```

# Download staruml
```bash
wget -O staruml.deb https://staruml.io/download/releases-v4/StarUML_4.1.6_amd64.deb
sudo apt install ./staruml.deb
```

# Download termius
```bash
wget -O termius.deb https://www.termius.com/download/linux/Termius.deb
sudo apt install ./termius.deb
```

# Download MEGA-sync
```bash
wget -O mega.deb https://mega.nz/linux/MEGAsync/xUbuntu_21.04/amd64/megasync-xUbuntu_21.04_amd64.deb
sudo apt install ./mega.deb
```

# Download meag sync nautilus
```bash
wget -O megafile.deb https://mega.nz/linux/MEGAsync/xUbuntu_21.04/amd64/nautilus-megasync-xUbuntu_21.04_amd64.deb
sudo apt install ./megasync.deb
```

# Setup java_home
```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
sudo update-alternatives --config java
sudo update-alternatives --config javac
```

# Install oh-my-zsh
```bash
sudo apt install zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```
# Install gh
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

# Dotfile download
```bash
ln -s ~/.dotfiles/.gitconfig ~/.gitconfig
ln -s ~/.dotfiles/.bashrc ~/.bashrc
ln -s ~/.dotfiles/.profile ~/.profile
ln -s ~/.dotfiles/.zsh_history ~/.zsh_history
ln -s ~/.dotfiles/.zshrc ~/.zshrc
```
# Download Insomnia
```bash
wget -O Insomnia.deb https://github.com/Kong/insomnia/releases/download/core%402021.6.0/Insomnia.Core-2021.6.0.deb
sudo apt install ./Insomnia.deb
```

# Github branching model
```bash
                        Branching Model

Master    ──────x─────────────x──────────────────────x───────────────────x─────  │
                                                                                 │
                                                                                 │
                                                                                 │
Hotfixes  ───────────────────────────────────────────────x─────────────────────  │
                                                                                 │
                                                                                 │
Release   ─────────────────────────────────────x───────────────────────────────  │
                                                                                 │
                                                                                 │
Develop   ─────────x─────────────x─────────────x───────────x──────────────x────  │
                                                                                 │
                                                                                 │
Feature-1 ─────x──────────────────────────x─────────────────────────────────x──  │
                                                                                 │
Feature-2 ───────────────x──────────────────────────────────────x──────────────  ▼
```
