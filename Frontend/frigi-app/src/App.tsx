import { MotionConfig, motion } from 'framer-motion'
import { Shell, Toast } from './components/Shell'
import { Button, Mascot } from './components/ui'
import { AppProvider, PageRouteContext, useApp, type StateKind } from './state/AppState'
import { ForgotPassword, Login, SignUp } from './screens/Auth'
import { Chef } from './screens/Chef'
import { Cook, Done } from './screens/Cook'
import { Home } from './screens/Home'
import { Ingredients } from './screens/Ingredients'
import { RecipeDetail } from './screens/RecipeDetail'
import { Recipes } from './screens/Recipes'
import { Profile, Saved } from './screens/SavedProfile'
import { Scanning } from './screens/Scanning'
import { StateScreen } from './screens/States'
import { Upload } from './screens/Upload'
import { Welcome } from './screens/Welcome'

const FULL = ['welcome', 'signup', 'login', 'forgot', 'cook', 'done']

/** Shown while a remembered session's profile loads, or if the backend can't be reached. */
function Boot() {
  const { boot, retryBoot, signOut } = useApp()
  return (
    <div className="grid min-h-full place-items-center p-6" aria-live="polite" aria-busy={boot === 'loading'}>
      <div className="flex flex-col items-center text-center">
        <Mascot pose={boot === 'offline' ? 'error' : 'appLogo'} size={180} motionKind={boot === 'offline' ? 'float' : 'bounce'} />
        {boot === 'loading' ? (
          <p className="mt-4 font-display text-xl font-semibold text-brown">Opening your kitchen…</p>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold text-brown">Frigi can’t reach its kitchen</h1>
            <p className="mt-1 max-w-sm text-brown-70">Check your connection, or try again in a moment.</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={retryBoot}>Try again</Button>
              <Button variant="ghost" onClick={signOut}>Sign out</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Renders the current route, inside the app shell unless the screen is full-page.
function Screen() {
  const { route, user, profile, boot } = useApp()
  if (user && (!profile || boot !== 'ready')) return <Boot />

  const key = route.name + JSON.stringify(route.params ?? {})
  const body = (() => {
    switch (route.name) {
      case 'welcome': return <Welcome />
      case 'signup': return <SignUp />
      case 'login': return <Login />
      case 'forgot': return <ForgotPassword />
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
      case 'state': return <StateScreen kind={route.params?.kind as StateKind} />
    }
  })()
  // Each page fades in. There is no fade-out: waiting for the old page to finish leaving
  // could stall and leave a blank screen (e.g. chef chat → recipe), so it is removed at once.
  const page = (
    <motion.div
      key={key}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageRouteContext.Provider value={route}>{body}</PageRouteContext.Provider>
    </motion.div>
  )
  const full = FULL.includes(route.name) || (route.name === 'state' && !user)
  return full ? <div className="min-h-full">{page}</div> : <Shell>{page}</Shell>
}

// Root component: motion settings, app state and the toast.
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
