import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCog, faSignOutAlt)

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(router).mount('#app')
