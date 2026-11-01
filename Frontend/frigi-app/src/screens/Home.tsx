import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Bookmark, Camera, ChefHat, Clock, PencilLine, Search, User } from 'lucide-react'
import { ICONS, POSES } from '../assets'
import { IngredientIcon } from '../components/IngredientIcon'
import { RecipeCard } from '../components/RecipeCard'
import { RecipeImage } from '../components/RecipeImage'
import { Button, Mascot, Pill, PoseThumb, SectionTitle } from '../components/ui'
import { DIET_LABEL } from '../lib/vocab'
import { useApp, useProfile } from '../state/AppState'

// Greeting that matches the time of day.
function greeting() {
  const h = new Date().getHours()
  return h < 11 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Dashboard: scan prompt, the chef's latest picks and the user's fridge.
export function Home() {
  const { go, inventory, saved, chef } = useApp()
  const profile = useProfile()
  const reduce = useReducedMotion()
  const options = chef?.result.options ?? []
  const featured = options[0]
  const more = options.slice(1, 4)
  // Staggered entrance animation for the i-th section.
  const fade = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 220, damping: 24 } })

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting */}
      <motion.header {...fade(0)} className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PoseThumb pose="appLogo" className="h-14 w-14 rounded-2xl bg-sun-50" zoom={1.1} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brown-70">{greeting()}, {profile.name} <span aria-hidden>·</span> serving {profile.householdSize}</p>
            <h1 className="font-display text-[28px] font-semibold leading-tight text-brown sm:text-[34px]">Hey {profile.name}, hungry?</h1>
          </div>
        </div>
        <button onClick={() => go('profile')} aria-label="Open profile" className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-red font-display text-lg font-semibold text-white shadow-red sm:grid">
          {profile.name.slice(0, 1).toUpperCase()}
        </button>
      </motion.header>

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Scan hero */}
        <motion.section {...fade(1)} aria-labelledby="scan-hero" className={`relative overflow-hidden rounded-5xl bg-cream p-6 pb-7 sm:p-8 ${featured ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sun/30" />
          <div aria-hidden className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/50" />
          <div className="relative grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <div className="relative z-[1]">
              <Pill tone="white" className="text-red"><Camera size={13} /> AI fridge scan</Pill>
              <h2 id="scan-hero" className="mt-3 max-w-sm max-sm:pr-24 font-display text-[30px] font-semibold leading-[1.08] text-brown [text-wrap:balance] sm:text-[38px]">What’s in your fridge today?</h2>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-brown-70 max-sm:pr-6">Snap up to three photos and Frigi will list your ingredients.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button size="lg" onClick={() => go('upload')} icon={<Camera size={19} />} className="max-sm:w-full">Scan My Fridge</Button>
                <Button size="lg" variant="ghost" onClick={() => go('ingredients', { manual: 1 })} icon={<PencilLine size={17} />} className="max-sm:w-full">Add by hand</Button>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-1 -top-2 w-[96px] sm:static sm:w-[190px]">
              <Mascot pose="upload" size="100%" />
            </div>
          </div>
        </motion.section>

        {/* Latest recommendation from the chef */}
        {featured && (
          <motion.section {...fade(2)} aria-labelledby="feat" className="relative flex flex-col rounded-5xl bg-white p-5 shadow-soft lg:col-span-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brown-50">Chef Frigi’s top pick</p>
            <button onClick={() => go('recipe', { optionId: featured.optionId })} className="group mt-3 flex flex-1 flex-col text-left">
              <RecipeImage src={featured.imageUrl} title={featured.title} className="aspect-[16/10] w-full rounded-4xl" />
              <h3 id="feat" className="mt-3 text-center font-display text-2xl font-semibold text-brown group-hover:text-red">{featured.title}</h3>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {featured.minutes ? <Pill><Clock size={12} /> {featured.minutes} min</Pill> : null}
                <Pill tone="leaf">Uses {featured.uses.length} you have</Pill>
                <span className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-brown text-white transition-colors group-hover:bg-red"><ArrowUpRight size={18} /></span>
              </div>
            </button>
          </motion.section>
        )}
      </div>

      {/* At a glance */}
      <motion.section {...fade(3)} aria-label="At a glance" className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { n: inventory.length, label: 'In your fridge', bg: 'bg-sun-50', icon: ICONS.broccoli, to: () => go('ingredients', { manual: 1 }) },
          { n: saved.length, label: 'Saved recipes', bg: 'bg-peach', icon: ICONS.whisk, to: () => go('saved') },
          { n: options.length, label: 'Ready to cook', bg: 'bg-leaf-50', icon: ICONS.cooking, to: () => go(options.length ? 'recipes' : 'chef') },
        ].map((t) => (
          <button key={t.label} onClick={t.to} className={`${t.bg} group rounded-4xl p-4 text-left transition-transform hover:-translate-y-1 sm:p-5`}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-soft"><img src={t.icon} alt="" className="h-6 w-6" /></span>
            <p className="mt-3 font-display text-[32px] font-semibold leading-none tabular-nums text-brown">{t.n}</p>
            <p className="mt-1 text-xs font-bold text-brown-70 sm:text-sm">{t.label}</p>
          </button>
        ))}
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Your fridge */}
        <motion.section {...fade(4)} aria-labelledby="recent" className="rounded-5xl bg-white p-5 shadow-soft sm:p-6 lg:col-span-7">
          <SectionTitle id="recent" action={inventory.length ? <button onClick={() => go('ingredients', { manual: 1 })} className="text-sm font-bold text-red hover:underline">Edit</button> : undefined}>In your fridge</SectionTitle>
          {inventory.length ? (
            <ul className="flex flex-wrap gap-2">
              {inventory.map((item) => (
                <li key={(item.id ?? '') + item.name} className="inline-flex items-center gap-2 rounded-full bg-cream-50 py-1 pl-1 pr-3.5 text-sm font-bold text-brown">
                  <IngredientIcon name={item.name} id={item.id} size={30} className="!rounded-full bg-white" /> {item.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-4 rounded-3xl bg-cream-50 p-4">
              <img src={POSES.scanning} alt="" className="h-20 w-auto" />
              <div>
                <p className="font-bold text-brown">Nothing here yet</p>
                <p className="text-sm text-brown-70">Scan your fridge or add ingredients by hand to get recipe ideas.</p>
                <button onClick={() => go('upload')} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-red hover:underline">Scan now <ArrowRight size={14} /></button>
              </div>
            </div>
          )}
        </motion.section>

        {/* Quick links */}
        <motion.section {...fade(5)} aria-label="Quick links" className="grid grid-cols-2 gap-3 lg:col-span-5 lg:gap-4">
          <button onClick={() => go('chef')} className="group relative overflow-hidden rounded-4xl bg-red p-5 text-left text-white shadow-red">
            <ChefHat size={22} />
            <p className="relative z-[1] mt-3 pr-6 font-display text-lg font-semibold leading-tight sm:pr-10">Chat with Chef Frigi</p>
            <p className="mt-1 text-xs font-semibold text-white/85">Tell me your mood</p>
            <img src={POSES.recommends} alt="" className="absolute -bottom-8 -right-8 w-20 transition-transform sm:w-24 group-hover:-translate-y-1 group-hover:rotate-[-4deg]" />
          </button>
          <div className="grid gap-3">
            <button onClick={() => go('recipes')} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-soft hover:bg-cream-50">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-peach text-red"><Search size={18} /></span>
              <span className="text-sm font-bold text-brown">Find a recipe<br /><span className="font-semibold text-brown-50">By dish or ingredient</span></span>
            </button>
            <button onClick={() => go('saved')} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-soft hover:bg-cream-50">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Bookmark size={18} /></span>
              <span className="text-sm font-bold text-brown">Saved<br /><span className="font-semibold text-brown-50">{saved.length} recipes</span></span>
            </button>
          </div>
        </motion.section>
      </div>

      <motion.button {...fade(6)} onClick={() => go('profile')} className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-soft hover:bg-cream-50 sm:hidden">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sun-50 text-sun-700"><User size={18} /></span>
        <span className="text-sm font-bold text-brown">Profile<br /><span className="font-semibold text-brown-50">Diet: {DIET_LABEL[profile.diet]} · {profile.allergies.length ? `${profile.allergies.length} allerg${profile.allergies.length > 1 ? 'ies' : 'y'}` : 'no allergies'}</span></span>
      </motion.button>

      {/* More from the chef's latest results */}
      {more.length > 0 && (
        <section aria-labelledby="sugg">
          <SectionTitle id="sugg" action={<button onClick={() => go('recipes')} className="text-sm font-bold text-red hover:underline">See all</button>}>Cook with what you have</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((o, i) => <RecipeCard key={o.optionId} option={o} origin="fridge" index={i} compact />)}
          </div>
        </section>
      )}
    </div>
  )
}
