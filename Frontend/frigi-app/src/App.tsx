import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Shell, Toast } from './components/Shell'
import { AppProvider, useApp, type StateKind } from './state/AppState'
import { Login, SignUp } from './screens/Auth'
import { Chef } from './screens/Chef'
import { Cook, Done } from './screens/Cook'
import { Home } from './screens/Home'
import { Ingredients } from './screens/Ingredients'
import { RecipeDetail } from './screens/RecipeDetail'
import { Recipes } from './screens/Recipes'
import { Profile, Saved } from './screens/SavedProfile'
import { Scanning } from './screens/Scanning'
import { StateScreen, StatesGallery } from './screens/States'
import { Upload } from './screens/Upload'
import { Welcome } from './screens/Welcome'

const FULL = ['welcome', 'signup', 'login', 'cook', 'done']

function Screen() {
  const { route, session } = useApp()
  const key = route.name + JSON.stringify(route.params ?? {})
  const body = (() => {
    switch (route.name) {
      case 'welcome': return <Welcome />
      case 'signup': return <SignUp />
      case 'login': return <Login />
      case 'home': return <Home />
      case 'upload': return <Upload />
      case 'scanning': return <Scanning />
      case 'ingredients': return <Ingredients />
      case 'chef': return <Chef />
      case 'recipes': return <Recipes />
      case 'recipe': return <RecipeDetail />
      case 'cook': return <Cook />
      case 'done': return <Done />
      case 'saved': return <Saved />
      case 'profile': return <Profile />
      case 'states': return <StatesGallery />
      case 'state': return <StateScreen kind={route.params?.kind as StateKind} />
    }
  })()
  const page = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {body}
      </motion.div>
    </AnimatePresence>
  )
  const full = FULL.includes(route.name) || (route.name === 'state' && !session)
  return full ? <div className="min-h-full">{page}</div> : <Shell>{page}</Shell>
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <Screen />
        <Toast />
      </AppProvider>
    </MotionConfig>
  )
}
