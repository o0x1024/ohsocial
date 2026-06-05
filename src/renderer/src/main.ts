import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faBolt,
  faBook,
  faBrain,
  faCalendarDays,
  faChevronDown,
  faChevronUp,
  faCheckCircle,
  faCog,
  faDatabase,
  faDesktop,
  faEraser,
  faExclamationCircle,
  faExpand,
  faEye,
  faEyeSlash,
  faFileLines,
  faFlask,
  faFolder,
  faFont,
  faGem,
  faGlobe,
  faHouse,
  faInfoCircle,
  faLightbulb,
  faLink,
  faMagnifyingGlass,
  faMoon,
  faPalette,
  faPenToSquare,
  faPlug,
  faPlus,
  faRobot,
  faRotate,
  faServer,
  faSliders,
  faSpinner,
  faTimes,
  faTrash,
  faWifi
} from '@fortawesome/free-solid-svg-icons'

library.add(
  faBolt,
  faBook,
  faBrain,
  faCalendarDays,
  faChevronDown,
  faChevronUp,
  faCheckCircle,
  faCog,
  faDatabase,
  faDesktop,
  faEraser,
  faExclamationCircle,
  faExpand,
  faEye,
  faEyeSlash,
  faFileLines,
  faFlask,
  faFolder,
  faFont,
  faGem,
  faGlobe,
  faHouse,
  faInfoCircle,
  faLightbulb,
  faLink,
  faMagnifyingGlass,
  faMoon,
  faPalette,
  faPenToSquare,
  faPlug,
  faPlus,
  faRobot,
  faRotate,
  faServer,
  faSliders,
  faSpinner,
  faTimes,
  faTrash,
  faWifi
)

import { initAppearanceSettings } from './services/appearanceSettings'
import App from './App.vue'
import router from './router'
import './assets/main.css'

initAppearanceSettings()

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(createPinia())
app.use(router)
app.mount('#app')
