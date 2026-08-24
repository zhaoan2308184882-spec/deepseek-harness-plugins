window.__ModuleLoader__.load({
  id: "@zhaoan2308184882-spec/dsh-hooks-model-router",
  factory: (require) => {
    const React = require("react")
    const h = React.createElement
    const inject = ["slots", "settingsScope", "connection", "sessions"]
    const ZERO = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 }
    const decode = (v) => v && typeof v === "object" ? v : undefined
    const useScope = (scope) => React.useSyncExternalStore(scope.subscribe.bind(scope), scope.getSnapshot.bind(scope), scope.getSnapshot.bind(scope))
    const compact = (v) => { const n=Number(v)||0; return n<1000?String(n):n<1e6?`${(n/1e3).toFixed(n<1e4?1:0)}K`:`${(n/1e6).toFixed(1)}M` }
    const total = (u) => (u.inputTokens||u.uncachedInputTokens||0)+(u.outputTokens||0)+(u.cacheReadTokens||0)+(u.cacheWriteTokens||0)
    const keyOf = (t) => t?.provider&&t?.model ? `${t.provider}\u0000${t.model}` : ""
    const offsetKey = (t) => t?.provider&&t?.model ? `${encodeURIComponent(t.provider)}|${encodeURIComponent(t.model)}` : ""
    const subtract = (value, baseline) => ({
      inputTokens: Math.max(0,(value.inputTokens||0)-(baseline?.inputTokens||0)),
      outputTokens: Math.max(0,(value.outputTokens||0)-(baseline?.outputTokens||0)),
      cacheReadTokens: Math.max(0,(value.cacheReadTokens||0)-(baseline?.cacheReadTokens||0)),
      cacheWriteTokens: Math.max(0,(value.cacheWriteTokens||0)-(baseline?.cacheWriteTokens||0)),
      reasoningTokens: Math.max(0,(value.reasoningTokens||0)-(baseline?.reasoningTokens||0)),
    })

    function Metric({label,value,accent}) {
      return h("div",{className:`mr-metric${accent?" accent":""}`},h("span",null,label),h("strong",null,value))
    }
    function Toggle({label,hint,checked,disabled,onChange}) {
      return h("label",{className:"mr-toggle"},h("span",null,h("strong",null,label),h("small",null,hint)),
        h("input",{type:"checkbox",checked,disabled,onChange}))
    }
    function Dropdown({value,options,disabled,onChange,placeholder}) {
      const [open,setOpen]=React.useState(false)
      const root=React.useRef(null)
      const selected=options.find(option=>option.value===value)
      React.useEffect(()=>{
        if(!open)return
        const close=event=>{if(!root.current?.contains(event.target))setOpen(false)}
        const key=event=>{if(event.key==="Escape")setOpen(false)}
        document.addEventListener("pointerdown",close)
        document.addEventListener("keydown",key)
        return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key)}
      },[open])
      return h("div",{className:"mr-dropdown",ref:root},
        h("button",{type:"button",className:"mr-dropdown-trigger",disabled,"aria-haspopup":"listbox","aria-expanded":open,onClick:()=>setOpen(current=>!current)},
          h("span",null,selected?.label||placeholder),h("i",null,"⌄")),
        open?h("div",{className:"mr-dropdown-menu",role:"listbox"},options.map(option=>h("button",{type:"button",role:"option","aria-selected":option.value===value,className:option.value===value?"selected":"",key:option.value,onClick:()=>{onChange(option.value);setOpen(false)}},h("span",null,option.label),option.description?h("small",null,option.description):null))):null)
    }
    function RouteCard({role,title,subtitle,target,groups,usage,scope,disabled,color}) {
      const provider=target?.provider||"", model=target?.model||""
      const models=groups.find(g=>g.id===provider)?.models||[]
      const save=(p,m)=>void scope.set(role,{provider:p,model:m})
      return h("article",{className:"mr-route",style:{"--accent":color}},
        h("header",null,h("b",null,role[0].toUpperCase()),h("div",null,h("h3",null,title),h("p",null,subtitle))),
        h("label",null,h("span",null,"Provider"),h(Dropdown,{value:provider,disabled,placeholder:"选择 Provider",onChange:p=>save(p,groups.find(g=>g.id===p)?.models?.[0]?.id||""),options:groups.map(g=>({value:g.id,label:`${g.name} (${g.id})`}))})),
        h("label",null,h("span",null,"Model"),h(Dropdown,{value:model,disabled:disabled||!provider,placeholder:provider?"选择模型":"请先选择 Provider",onChange:m=>save(provider,m),options:[...model&&!models.some(m=>m.id===model)?[{value:model,label:`${model}（当前配置）`}]:[],...models.map(m=>({value:m.id,label:m.name===m.id?m.id:`${m.name} (${m.id})`}))]})),
        h("code",null,provider&&model?`${provider} / ${model}`:"尚未配置"),
        role==="executor"?h("div",{className:"mr-role-hint"},"Executor 需要使用支持工具调用的模型；模型目录暂未提供自动检测标记。"):null,
        h("div",{className:"mr-card-stats"},h(Metric,{label:"总 Tokens",value:compact(total(usage)),accent:true}),
          h(Metric,{label:"输入",value:compact(usage.inputTokens)}),h(Metric,{label:"输出",value:compact(usage.outputTokens)}),
          h(Metric,{label:"缓存",value:compact((usage.cacheReadTokens||0)+(usage.cacheWriteTokens||0))}),h(Metric,{label:"推理",value:compact(usage.reasoningTokens)})))
    }

    function RouterSection({scope,api,sessions,useSessions}) {
      const snap=useScope(scope)
      const [catalog,setCatalog]=React.useState({loading:true,groups:[],failures:[],error:""})
      const [action,setAction]=React.useState({type:"",status:""})
      const [permissionAction,setPermissionAction]=React.useState({status:"",message:""})
      const [confirmingFullAccess,setConfirmingFullAccess]=React.useState(false)
      const [riskAcknowledged,setRiskAcknowledged]=React.useState(false)
      const currentSessionId=useSessions(s=>s.current)
      const selected=useSessions(s=>s.current?s.byId[s.current]:undefined)
      const projections=selected?.projectionValues||{}, routed=projections.routerUsage||{routes:{}}
      const permissions=projections.permissions
      const refresh=React.useCallback(async()=>{setCatalog(c=>({...c,loading:true,error:""}));try{const r=await api.llm.models({});if(!r.result.ok)throw new Error(r.result.error.message);setCatalog({loading:false,groups:r.result.value.groups,failures:r.result.value.failures,error:""});return true}catch(e){setCatalog({loading:false,groups:[],failures:[],error:e instanceof Error?e.message:String(e)});return false}},[api])
      React.useEffect(()=>{void refresh()},[refresh])
      React.useEffect(()=>{
        if(action.status!=="success"&&action.status!=="error")return
        const timer=window.setTimeout(()=>setAction({type:"",status:""}),1000)
        return()=>window.clearTimeout(timer)
      },[action.type,action.status])
      if(snap.status==="loading")return h("div",{className:"mr-empty"},"正在加载 Model Router…")
      if(snap.status!=="ready"||!snap.value)return h("div",{className:"mr-empty warn"},"Model Router 设置不可用")
      const c=snap.value, disabled=!snap.writable, current=routed.current
      const permissionValue=permissions?.currentValue
      const permissionOption=permissions?.options?.find(option=>option.value===permissionValue)
      const permissionLabel=permissionValue==="workspace-write"?"工作区可写":permissionValue==="danger-full-access"?"完全访问":permissionValue==="read-only"?"只读":permissionOption?.name||permissionValue||"由会话配置决定"
      const permissionOptions=(permissions?.options||[]).filter(option=>option.value!=="custom").map(option=>({value:option.value,label:option.value==="workspace-write"?"工作区可写":option.value==="danger-full-access"?"完全访问":option.value==="read-only"?"只读":option.name||option.value,description:option.description}))
      const applyPermission=async value=>{
        const live=currentSessionId?sessions.binding(currentSessionId)?.session:undefined
        if(!live){setPermissionAction({status:"error",message:"当前会话尚未就绪"});return}
        setPermissionAction({status:"loading",message:"正在切换权限…"})
        try{
          const result=await live.command(`/permission ${value}`)
          if(!result.ok)throw new Error(result.error?.message||"权限切换失败")
          if(!result.value?.matched)throw new Error("当前 Harness 未启用权限切换命令")
          setPermissionAction({status:"success",message:"权限已更新"})
          window.setTimeout(()=>setPermissionAction({status:"",message:""}),1000)
        }catch(error){setPermissionAction({status:"error",message:error instanceof Error?error.message:String(error)})}
      }
      const selectPermission=value=>{
        if(value===permissionValue)return
        if(value==="danger-full-access"){
          setRiskAcknowledged(false)
          setConfirmingFullAccess(true)
          return
        }
        void applyPermission(value)
      }
      const mode=c.enabled!==true?"off":c.rule==="review"?"review":"roles"
      const setMode=async value=>{
        if(value==="off"){
          await scope.set("enabled",false)
          return
        }
        await scope.set("rule",value==="review"?"review":"auto")
        await scope.set("enabled",true)
      }
      const rawUsageFor=t=>routed.routes[keyOf(t)]||ZERO
      const usageFor=t=>subtract(rawUsageFor(t),c.usageOffsets?.[offsetKey(t)])
      const finishAction=(type,status)=>{
        setAction({type,status})
      }
      const resetUsage=async()=>{
        setAction({type:"reset",status:"loading"})
        const next={...(c.usageOffsets||{})}
        for(const target of [c.planner,c.executor,c.reviewer]){
          const key=offsetKey(target)
          if(key)next[key]={...rawUsageFor(target)}
        }
        try{await scope.set("usageOffsets",next);finishAction("reset","success")}catch{finishAction("reset","error")}
      }
      const refreshModels=async()=>{
        setAction({type:"refresh",status:"loading"})
        const ok=await refresh()
        finishAction("refresh",ok?"success":"error")
      }
      return h("div",{className:"mr-shell"},
        h("section",{className:"mr-hero"},h("div",null,h("h2",null,"模型路由"),h("p",null,"为规划、执行和审查阶段指定不同模型。")),
          h("aside",null,h("span",null,"最近实际路由"),h("strong",null,current?`${current.provider} / ${current.model}`:"等待首次模型请求"),h("small",null,selected?.displayTitle||"当前没有选中的会话"))),
        h("section",{className:"mr-controls"},
          h("div",{className:"mr-rule"},h("span",null,h("strong",null,"路由模式"),h("small",null,mode==="off"?"始终使用聊天中选择的模型":mode==="review"?"使用角色模型，并在任务结束前自动调用 Reviewer":"使用角色模型；Reviewer 仅通过 /review 调用")),h(Dropdown,{value:mode,disabled,onChange:value=>void setMode(value),options:[{value:"off",label:"关闭",description:"始终使用会话中选择的模型"},{value:"roles",label:"角色路由",description:"使用配置的角色模型，Reviewer 需 /review 调用"},{value:"review",label:"自动审查",description:"使用配置的角色模型，并自动调用 Reviewer"}]})),
          mode!=="off"?h("div",{className:"mr-routing-note",role:"note"},h("b",null,"!"),h("span",null,h("strong",null,"模型选择将被覆盖"),h("small",null,"启用后以角色配置的模型为准，对话框中选择或切换的模型不会生效。"))):null),
        mode!=="off"?h("section",{className:"mr-permission"},h("div",null,h("span",null,"当前会话权限"),permissionOptions.length?h(Dropdown,{value:permissionValue,options:permissionOptions,disabled:permissionAction.status==="loading"||!currentSessionId,onChange:selectPermission,placeholder:permissionLabel}):h("strong",null,permissionLabel),permissionAction.message?h("small",{className:`is-${permissionAction.status}`},permissionAction.message):permissionOption?.description?h("small",null,permissionOption.description):null),h("p",null,"Planner、Executor 和 Reviewer 共用这套权限。修改后作用于整个当前会话，不会只影响某一个角色。"),confirmingFullAccess?h("div",{className:"mr-permission-confirm",role:"alertdialog"},h("strong",null,"启用完全访问？"),h("p",null,"完全访问会取消文件沙箱限制并减少确认步骤，模型可以执行敏感操作、修改工作区外文件或运行外部命令。仅在你信任当前任务时启用。"),h("label",null,h("input",{type:"checkbox",checked:riskAcknowledged,onChange:event=>setRiskAcknowledged(event.target.checked)}),"我了解并接受上述风险"),h("div",null,h("button",{type:"button",onClick:()=>setConfirmingFullAccess(false)},"取消"),h("button",{type:"button",disabled:!riskAcknowledged,onClick:()=>{setConfirmingFullAccess(false);void applyPermission("danger-full-access")}},"确认启用"))):null):null,
        h("div",{className:"mr-title"},h("div",null,h("h3",null,"角色模型"),h("p",null,catalog.loading?"正在读取可用模型…":`已加载 ${catalog.groups.length} 个 Provider`)),h("div",{className:"mr-actions"},h("button",{onClick:resetUsage,disabled:disabled||action.status==="loading",className:action.type==="reset"?`is-${action.status}`:""},action.type==="reset"?(action.status==="loading"?"重置中…":action.status==="success"?"✓ 已重置":"重置失败"):"重置统计"),h("button",{onClick:refreshModels,disabled:catalog.loading||action.status==="loading",className:action.type==="refresh"?`is-${action.status}`:""},action.type==="refresh"?(action.status==="loading"?"刷新中…":action.status==="success"?"✓ 已刷新":"刷新失败"):"刷新模型"))),
        catalog.error?h("div",{className:"mr-alert"},`模型目录读取失败：${catalog.error}`):null,
        catalog.failures.length?h("div",{className:"mr-alert soft"},`${catalog.failures.length} 个 Provider 暂时不可用，其余仍可选择`):null,
        h("section",{className:"mr-routes"},h(RouteCard,{role:"planner",title:"Planner",subtitle:"拆解目标与制定方案",target:c.planner,groups:catalog.groups,usage:usageFor(c.planner),scope,disabled:disabled||catalog.loading,color:"#8b5cf6"}),h(RouteCard,{role:"executor",title:"Executor",subtitle:"调用工具与实施任务",target:c.executor,groups:catalog.groups,usage:usageFor(c.executor),scope,disabled:disabled||catalog.loading,color:"#06b6d4"}),h(RouteCard,{role:"reviewer",title:"Reviewer",subtitle:"检查结果与发现问题",target:c.reviewer,groups:catalog.groups,usage:usageFor(c.reviewer),scope,disabled:disabled||catalog.loading,color:"#f59e0b"})),
        h("footer",null,"会话命令 ",h("code",null,"/plan"),h("code",null,"/exec"),h("code",null,"/review"),h("code",null,"/router auto")))
    }

    const css=`.mr-shell{--bd:color-mix(in srgb,currentColor 14%,transparent);display:grid;gap:18px;padding:2px 2px 28px}.mr-hero{display:flex;justify-content:space-between;align-items:center;gap:22px;padding:25px;border:1px solid #8b5cf655;border-radius:18px;background:radial-gradient(circle at 85% 15%,#8b5cf62c,transparent 42%),linear-gradient(135deg,#111827cc,#312e8144)}.mr-hero em{display:flex;align-items:center;gap:8px;color:#a78bfa;font:800 11px/1 sans-serif;letter-spacing:.16em}.mr-hero i{width:8px;height:8px;border-radius:50%;background:#64748b}.mr-hero i.live{background:#22c55e;box-shadow:0 0 0 5px #22c55e22}.mr-hero h2{font-size:28px;margin:9px 0 5px}.mr-hero p{margin:0;opacity:.7}.mr-hero aside{min-width:240px;display:grid;gap:5px;padding:14px 16px;border:1px solid var(--bd);border-radius:12px;background:#0003}.mr-hero aside span,.mr-hero aside small{font-size:11px;opacity:.6}.mr-hero aside strong{font-size:13px;word-break:break-all}.mr-overview{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.mr-metric{display:grid;gap:5px;min-width:0;padding:12px;border:1px solid var(--bd);border-radius:11px;background:color-mix(in srgb,currentColor 3%,transparent)}.mr-metric span{font-size:10px;opacity:.6;white-space:nowrap}.mr-metric strong{font-size:17px;overflow:hidden;text-overflow:ellipsis}.mr-metric.accent strong{color:#a78bfa}.mr-pressure{height:7px;position:relative;margin-top:-10px;border-radius:99px;background:#64748b22}.mr-pressure div{height:100%;border-radius:inherit;background:linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)}.mr-pressure span{position:absolute;right:0;top:12px;font-size:10px;opacity:.55}.mr-controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:17px;border:1px solid var(--bd);border-radius:14px}.mr-toggle,.mr-rule{display:flex;align-items:center;justify-content:space-between;gap:12px}.mr-toggle>span,.mr-rule>span{display:grid}.mr-toggle small,.mr-rule small{font-size:10px;opacity:.55}.mr-toggle input{width:18px;height:18px;accent-color:#8b5cf6}.mr-rule select,.mr-route select{padding:9px;border:1px solid var(--bd);border-radius:8px;background:var(--ds-color-bg,#171717);color:inherit;min-width:0}.mr-title{display:flex;justify-content:space-between;align-items:end}.mr-title h3{margin:0}.mr-title p{margin:3px 0 0;font-size:11px;opacity:.6}.mr-title button{padding:7px 11px;border:1px solid var(--bd);border-radius:8px;background:transparent;color:inherit}.mr-routes{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.mr-route{display:grid;gap:13px;padding:16px;border:1px solid var(--bd);border-top:2px solid var(--accent);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 8%,transparent),transparent 35%)}.mr-route header{display:flex;gap:10px;align-items:center}.mr-route header>b{display:grid;place-items:center;width:35px;height:35px;border-radius:10px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}.mr-route h3{margin:0;font-size:16px}.mr-route p{margin:2px 0 0;font-size:10px;opacity:.6}.mr-route>label{display:grid;gap:4px}.mr-route>label span{font-size:10px;opacity:.6}.mr-route code{font-size:10px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mr-card-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px}.mr-card-stats .mr-metric:first-child{grid-column:span 2}.mr-card-stats .mr-metric{padding:8px}.mr-card-stats .mr-metric strong{font-size:13px}.mr-alert{padding:10px 12px;border:1px solid #ef444455;border-radius:9px;background:#ef444412;color:#fca5a5;font-size:11px}.mr-alert.soft{border-color:#f59e0b55;background:#f59e0b10;color:#fcd34d}.mr-shell footer{display:flex;gap:7px;align-items:center;font-size:10px;opacity:.65}.mr-shell footer code{padding:3px 6px;border-radius:5px;background:#64748b22}.mr-empty{padding:30px;text-align:center}.warn{color:#f59e0b}@media(max-width:1100px){.mr-overview{grid-template-columns:repeat(3,1fr)}.mr-routes{grid-template-columns:1fr}.mr-controls{grid-template-columns:1fr}}@media(max-width:700px){.mr-hero{align-items:flex-start;flex-direction:column}.mr-hero aside{width:100%;box-sizing:border-box}.mr-overview{grid-template-columns:repeat(2,1fr)}}`
    const simpleCss=`
      .mr-shell{--surface:color-mix(in srgb,currentColor 3%,transparent);gap:16px}
      .mr-hero{padding:18px;border:1px solid var(--bd);border-radius:10px;background:var(--surface)}
      .mr-hero em{color:inherit;font:600 12px/1 sans-serif;letter-spacing:0;font-style:normal}
      .mr-hero i{width:7px;height:7px;background:#888}.mr-hero i.live{background:#22a06b;box-shadow:none}
      .mr-hero h2{font-size:20px;margin:8px 0 4px}.mr-hero p{font-size:13px}
      .mr-hero aside{padding:10px 14px;border:0;border-left:1px solid var(--bd);border-radius:0;background:transparent}
      .mr-metric{padding:10px 11px;border-radius:8px;background:var(--surface)}
      .mr-metric strong{font-size:15px}.mr-metric.accent strong{color:inherit}
      .mr-pressure{height:5px;border-radius:4px;background:color-mix(in srgb,currentColor 8%,transparent)}
      .mr-pressure div{background:currentColor;opacity:.55}
      .mr-controls{gap:18px;padding:15px;border-radius:10px}
      .mr-toggle small,.mr-rule small{font-size:11px;line-height:1.35}
      .mr-toggle input{width:17px;height:17px;accent-color:auto}
      .mr-rule select,.mr-route select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--surface);color:inherit;font:inherit}
      .mr-rule select,.mr-route select{color-scheme:light}
      body[data-ds-dark-theme] .mr-rule select,body[data-ds-dark-theme] .mr-route select{color-scheme:dark}
      .mr-rule option,.mr-route option{background:Canvas;color:CanvasText}
      .mr-rule select{width:auto;min-width:125px}
      .mr-title h3{font-size:16px}.mr-title button{border-radius:6px;background:var(--surface);font:inherit}
      .mr-actions{display:flex;gap:8px}.mr-actions button{white-space:nowrap}
      .mr-actions button.is-loading{cursor:wait;opacity:.7}.mr-actions button.is-success{border-color:#22a06b;color:#55c991}.mr-actions button.is-error{border-color:#d84a4a;color:#ff7777}
      .mr-route{padding:15px;border:1px solid var(--bd);border-radius:10px;background:var(--surface)}
      .mr-route header>b{width:30px;height:30px;border:1px solid var(--bd);border-radius:6px;background:transparent;color:inherit;font-size:12px}
      .mr-route h3{font-size:15px}.mr-route p,.mr-route>label span{font-size:11px}
      .mr-role-hint{margin-top:-4px;padding:7px 8px;border-left:2px solid #d99b32;background:color-mix(in srgb,#d99b32 7%,transparent);font-size:10px;line-height:1.4;opacity:.82}
      .mr-alert,.mr-alert.soft{border-color:var(--bd);background:var(--surface);color:inherit;border-radius:8px}
      .mr-shell footer code{border:1px solid var(--bd);background:transparent;border-radius:4px}
      @media(max-width:700px){.mr-hero aside{border-left:0;border-top:1px solid var(--bd)}}
      .mr-controls{position:relative;z-index:5;display:grid!important;grid-template-columns:1fr!important;gap:0!important;padding:0!important;overflow:visible}
      .mr-toggle,.mr-rule{min-width:0;padding:14px 16px}
      .mr-toggle+.mr-toggle,.mr-toggle+.mr-rule,.mr-rule+.mr-toggle,.mr-rule+.mr-routing-note,.mr-routing-note+.mr-toggle{border-top:1px solid var(--bd)}
      .mr-routing-note{display:flex;align-items:flex-start;gap:10px;padding:11px 16px;color:#d99b32;background:color-mix(in srgb,#d99b32 9%,transparent)}
      .mr-routing-note>b{display:grid;place-items:center;flex:0 0 18px;width:18px;height:18px;margin-top:1px;border:1px solid currentColor;border-radius:50%;font-size:11px;line-height:1}.mr-routing-note>span{display:grid;gap:2px;min-width:0}.mr-routing-note strong{font-size:12px;line-height:1.35;color:var(--dsw-alias-label-primary,currentColor)}.mr-routing-note small{font-size:11px;line-height:1.45;color:var(--dsw-alias-label-caption,currentColor);opacity:.78}
      .mr-permission{display:grid;grid-template-columns:minmax(190px,240px) 1fr;align-items:center;gap:14px 18px;padding:12px 16px;border:1px solid var(--bd);border-radius:10px;background:var(--surface)}.mr-permission>div{display:grid;gap:5px}.mr-permission span,.mr-permission small{font-size:10px;opacity:.62}.mr-permission small.is-success{color:#55c991;opacity:1}.mr-permission small.is-error{color:#ff7777;opacity:1}.mr-permission strong{font-size:13px}.mr-permission>p{margin:0;padding-left:18px;border-left:1px solid var(--bd);font-size:11px;line-height:1.5;opacity:.72}.mr-permission .mr-dropdown-trigger{height:40px}
      .mr-permission-confirm{grid-column:1/-1!important;display:grid!important;gap:10px!important;padding:12px!important;border:1px solid #d99b3266;border-radius:8px;background:color-mix(in srgb,#d99b32 8%,transparent)}.mr-permission-confirm>p{margin:0;padding:0;border:0;font-size:11px;line-height:1.5;opacity:.8}.mr-permission-confirm>label{display:flex;align-items:center;gap:8px;font-size:11px}.mr-permission-confirm>label input{width:16px;height:16px}.mr-permission-confirm>div{display:flex;justify-content:flex-end;gap:8px}.mr-permission-confirm button{padding:7px 11px;border:1px solid var(--bd);border-radius:6px;background:transparent;color:inherit;font:inherit}.mr-permission-confirm button:last-child{border-color:#d99b32}.mr-permission-confirm button:disabled{opacity:.4}
      @media(max-width:700px){.mr-permission{grid-template-columns:1fr}.mr-permission p{padding-left:0;padding-top:10px;border-left:0;border-top:1px solid var(--bd)}}
      .mr-toggle>span,.mr-rule>span{min-width:0;padding-right:20px}
      .mr-toggle strong,.mr-rule strong{font-size:14px;white-space:nowrap}
      .mr-toggle small,.mr-rule small{white-space:normal}
      .mr-toggle input{flex:0 0 auto;margin:0}
      .mr-rule select{flex:0 0 180px;width:180px}
      .mr-metric strong{white-space:nowrap}
      .mr-dropdown{position:relative;width:100%;min-width:0}
      .mr-dropdown-trigger{box-sizing:border-box;width:100%;height:46px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;color:var(--dsw-alias-label-primary,currentColor);font:inherit;text-align:left;background:var(--dsw-alias-bg-layer-1,var(--surface));border:1px solid var(--dsw-alias-border-l2,var(--bd));border-radius:8px;cursor:pointer}
      .mr-dropdown-trigger:hover:not(:disabled),.mr-dropdown-trigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover,var(--surface));border-color:var(--dsw-alias-border-l3,var(--bd))}
      .mr-dropdown-trigger:disabled{cursor:default;opacity:.5}.mr-dropdown-trigger>span{min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.mr-dropdown-trigger>i{flex:0 0 auto;font-style:normal;color:var(--dsw-alias-label-caption,currentColor);font-size:16px;transform:translateY(-1px)}
      .mr-dropdown-menu{z-index:1200;box-sizing:border-box;position:absolute;top:calc(100% + 4px);left:0;width:100%;max-height:240px;overflow:auto;padding:4px;background:var(--dsw-specific-menu,#252525);border:1px solid var(--dsw-alias-border-inverted,var(--bd));border-radius:8px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px #0006)}
      .mr-dropdown-menu button{box-sizing:border-box;width:100%;min-height:34px;display:grid;gap:2px;padding:7px 9px;color:var(--dsw-alias-label-primary,currentColor);font:inherit;text-align:left;background:transparent;border:0;border-radius:6px;cursor:pointer}
      .mr-dropdown-menu button>span{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.mr-dropdown-menu button>small{font-size:11px;line-height:1.35;color:var(--dsw-alias-label-caption,currentColor);opacity:.65;white-space:normal}
      .mr-dropdown-menu button:hover{background:var(--dsw-alias-interactive-bg-hover)}.mr-dropdown-menu button.selected{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
      .mr-rule .mr-dropdown{flex:0 0 240px;width:240px}.mr-rule .mr-dropdown-trigger{height:46px}
      button.mr-router-nav>svg{display:none}
      button.mr-router-nav:before{content:"⇄";display:grid;place-items:center;width:16px;height:16px;flex:0 0 16px;font-size:18px;font-weight:400;line-height:1}
    `
    function apply(ctx){ctx.effect(()=>{const s=document.createElement("style");s.dataset.plugin="@zhaoan2308184882-spec/dsh-hooks-model-router";s.textContent=css+simpleCss;document.head.appendChild(s);const mark=()=>{for(const button of document.querySelectorAll("button")){const label=Array.from(button.children).find(node=>node.tagName==="SPAN"&&node.textContent?.trim()==="模型路由");if(label)button.classList.add("mr-router-nav")}};mark();const observer=new MutationObserver(mark);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();s.remove();for(const button of document.querySelectorAll("button.mr-router-nav"))button.classList.remove("mr-router-nav")}},"model-router styles");const scope=ctx.settingsScope.bind({namespace:"model-router",decode});const api=ctx.get("connection").api;ctx.slots.inject("settings.section",()=>ctx.slots.register({name:"settings.section",id:"model-router",order:20,label:()=>"模型路由",inject:()=>({scope,api,sessions:ctx.sessions})},RouterSection))}
    return {apply,inject}
  },
})
