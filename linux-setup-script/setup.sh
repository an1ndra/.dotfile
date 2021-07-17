sudo apt install apt-transport-https curl vlc neovim git python3 android-studio xfce4-terminal gimp gnome-tweak-tool

sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg arch=amd64] https://brave-browser-apt-release.s3.brave.com/ stable main"|sudo tee /etc/apt/sources.list.d/brave-browser-release.list

sudo apt update

sudo apt install brave-browser

sudo apt-get remove --purge libreoffice*
sudo apt-get clean
sudo apt-get autoremove

# Install opejdk
sudo apt-get install openjdk-8-jdk
export JAVA\_HOME = /usr/lib/jvm/java-8-openjdk	
export PATH = $PATH:/usr/lib/jvm/java-8-openjdk/bin

# Install Krita
sudo add-apt-repository ppa:kritalime/ppa
sudo apt update
sudo apt-get install krita

# Add official repos
echo"
Package: codium
Pin: origin paulcarroty.gitlab.io 
Pin-Priority: 9999

Package: spotify-client
Pin: origin repository.spotify.com
Pin-Priority: 9999

Package: code
Pin: origin packages.microsoft.com
Pin-Priority: 9999">>/etc/apt/preferences.d/pop-default-settings

# Add Spotify Adblocker
git clone https://github.com/MrTuNNe/Spotify-AdBlocker
d Spotify-AdBlocker
sudo python3 spotify_adblock.py
cd ..

# Install Apps
sudo apt install code

# Install Spotify
curl -sS https://download.spotify.com/debian/pubkey_0D811D58.gpg | sudo apt-key add - 
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list

curl -sS https://download.spotify.com/debian/pubkey_0D811D58.gpg | sudo apt-key add - 
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list
sudo apt-get update && sudo apt-get install spotify-client

# Install obsidian
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'https://github.com/obsidianmd/obsidian-releases/releases/download/v0.9.20/obsidian_0.9.20_amd64.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"

# Install Dropbox
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'https://www.dropbox.com/download?dl=packages/ubuntu/dropbox_2020.03.04_amd64.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"

# Install Discord
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'https://dl.discordapp.net/apps/linux/0.0.15/discord-0.0.15.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"

# Install Zoom
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'https://zoom.us/client/latest/zoom_amd64.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"

# Install VirtualBox
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'https://download.virtualbox.org/virtualbox/6.1.22/virtualbox-6.1_6.1.22-144080~Ubuntu~eoan_amd64.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"

# Install telegram
sudo add-apt-repository ppa:atareao/telegram
sudo apt update
sudo apt install telegram
