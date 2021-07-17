source $HOME/.config/nvim/general/settings.vim
source $HOME/.config/nvim/general/mappings.vim
source $HOME/.config/nvim/general/plugins.vim
let g:ctrlp_user_command = ['.git/', 'git --git-dir=%s/.git ls-files -oc --exclude-standard']
