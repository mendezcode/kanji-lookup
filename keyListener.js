function focusSearchBox(e){
    document.getElementById("search-box").value = "";
    window.scrollTo(0, 0);
    document.getElementById("search-box").focus();
    getPageNumber();
}

shortcut.add("Esc", focusSearchBox, {
    'type' : 'keydown',
    'target' : document
});

