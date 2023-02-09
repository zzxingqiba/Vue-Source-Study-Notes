## Vue2
1. Vue.extend创建了Vue的一个子类，子类与Vue形成VueComponent.prototype.__proto__ = Vue.prototype
   
2. Vue.component的本质是内部调用了Vue.extend
   
3. 生命周期概述: 
new Vue时初始化了一些全局属性, 方法(render函数之类的，_c), 回调beforeCreate生命周期, 对数据做一些响应式处理,给methods配置项用bind绑定this值, 调用data函数, 
并将数据代理到vm实例上, 对data中数据进行响应式处理, 即数据劫持, 进入到created, 对模板进行AST解析, 之后进入到beforeMount阶段, 调用render方法将AST语法树转化为虚拟的VNode节点, 调用update方法将虚拟的VNode节点渲染成真实的DOM节点挂载到界面上, 进入到mounted, 当数据发生改变, 进入到beforeUpdate阶段, 调用patch方法进行虚拟节点比较
比较完完成更新, beforeDestory, destoryed

4. 观察者模式概述:
   会将data函数的返回值进行观察,同时会遍历每一个属性, 为每一个属性添加一个收集者Dep, 使用Object.defineProperty重写属性的get和set方法, 当进行模板解析读取属性时会触发属性的getter方法, 属性的收集者Dep会收集当前的Watcher(也就是观察者, 即渲染函数), 当属性值发生改变, 则会触发属性上的收集者, 收集者Dep会遍历自身收集到的Watcher, 通知Watcher去更新视图。

5. $set / $delete:
   初始化处理数据时, 每一个对象类型的属性对应一个Observer实例, Observer实例上会有一个收集者, 并且会给当前对象添加一个不可枚举的__ob__属性, 属性值指向当前Observe实例, 当调用$set时, 会通过__ob__属性找到收集者, 收集者通知Watcher使界面更新。
   
6. 数组的响应式(分两方面):
   1. 初始化处理数据时, 每一个对象类型的属性对应一个Observer实例, Observer实例上会有一个收集者, 并且会给当前对象添加一个不可枚举的__ob__属性, 属性值指向当前Observe实例,  
   2. 重新构造了当前数组的原型链, 对数组的7种方法进行了处理, 'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', (使用这些方法新添加的属性进行了数据劫持, 确保新添加的属性也是响应式的), 最后通过当前数组上的__ob__属性找到收集者, 收集者通知Watcher更新视图。
   
7. $nextTick原理: 
   对于一个代码块来说, 数据发生了改变, 不会立即更新视图, 其实内部也会调用nextTick, 它是采用了Promise.then或者其他3种兼容的写法, 开启了一个异步的更新队列, 等到数据更新完之后, 再统一进行更新。外部手动调用$nextTick会将回调函数添加到callback队列中, 之后依次执行callbacks中的回调， 所以可以获取到最新的DOM数据。
   
8. computed原理:
   初始化时, 会将每一个计算属性对应一个Watcher, 每一个watcher会有一个dirty标识属性, 初次时dirty标识为true, 用来标识是否重新执行计算属性对应的回调函数, 当初次读取计算属性中值时, 会将计算属性的返回值存到当前对应watcher的value属性上, 并dirty标识置为false, 以此形成多次使用只计算一次, 达到缓存的目的。并且计算属性所依赖的值收集了计算属性的watcher以及可能收集了渲染watcher, 当属性值发生改变, 会依次遍历自身收集到的watcher, 将计算属性watcher的dirty标识重新置为true, 读取计算属性时就会重新计算计算属性的值。
   
9. watch原理:
   初始化时, 会触发所需监视的属性的getter方法, 使其收集当前监听值得watcher, 当监听值发生改变时, 收集者遍历自身收集到的watcher, 重新取得最新值, 触发回调。

10. diff原理
     


    
