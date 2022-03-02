import { ASSET_TYPES } from '../../shared/constants'


export function initGlobalAPI(Vue){
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })
}