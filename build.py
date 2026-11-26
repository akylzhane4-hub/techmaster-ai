js=open('/home/claude/techmaster/hero.js',encoding='utf-8').read()
app=open('/home/claude/techmaster/page_noscript.html',encoding='utf-8').read()
def build(im,path):
    open(path,'w',encoding='utf-8').write(app.replace('</body>','<script type="importmap">'+im+'</script>\n<script type="module">\n'+js+'\n</script>\n</body>'))
build('{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"}}','/home/claude/techmaster/index.html')
build('{"imports":{"three":"http://localhost:8765/node_modules/three/build/three.module.js","three/addons/":"http://localhost:8765/node_modules/three/examples/jsm/"}}','/home/claude/t3/test.html')
