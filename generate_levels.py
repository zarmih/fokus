import random

def get_solutions(need, pool):
    # returns list of solutions (each solution is a list of subsets, one per need)
    # subset size <= 2
    
    solutions = []
    
    def backtrack(door_idx, current_pool, current_path):
        if door_idx == len(need):
            solutions.append(list(current_path))
            return
            
        target = need[door_idx]
        
        # try 1 element
        for i in range(len(current_pool)):
            if current_pool[i] == target:
                new_pool = current_pool[:i] + current_pool[i+1:]
                current_path.append([current_pool[i]])
                backtrack(door_idx+1, new_pool, current_path)
                current_path.pop()
                
        # try 2 elements
        for i in range(len(current_pool)):
            for j in range(i+1, len(current_pool)):
                if current_pool[i] + current_pool[j] == target:
                    new_pool = current_pool[:]
                    # remove j first then i to not mess up indices
                    new_pool.pop(j)
                    new_pool.pop(i)
                    current_path.append([current_pool[i], current_pool[j]])
                    backtrack(door_idx+1, new_pool, current_path)
                    current_path.pop()
                    
    backtrack(0, pool, [])
    # unique solutions (ignoring order within pairs)
    unique_sols = set()
    for sol in solutions:
        canon = tuple(tuple(sorted(subset)) for subset in sol)
        unique_sols.add(canon)
        
    return list(unique_sols)


levels = []
while len(levels) < 20:
    # generate random targets
    if len(levels) < 5:
        need = [random.randint(5, 9) for _ in range(4)]
    elif len(levels) < 15:
        need = [random.randint(7, 12) for _ in range(4)]
    else:
        need = [random.randint(10, 16) for _ in range(4)]
        
    # generate a valid solution
    pool = []
    has_single_for_first = False
    for i, n in enumerate(need):
        if i == 0:
            # force a pair for the first one in the intended solution
            a = random.randint(1, n-1)
            b = n - a
            pool.extend([a, b])
        else:
            if random.random() < 0.3:
                pool.append(n)
            else:
                a = random.randint(1, n-1)
                b = n - a
                pool.extend([a, b])
                
    # maybe add 1 distractor
    pool.append(random.randint(1, max(need)))
    
    # check if greedy on door 1 is possible
    # We want pool to contain the value need[0]
    if need[0] not in pool:
        pool.append(need[0])
        
    sols = get_solutions(need, pool)
    
    # Check if greedy on first door leads to solution
    greedy_works = False
    for sol in sols:
        if len(sol[0]) == 1 and sol[0][0] == need[0]:
            greedy_works = True
            break
            
    if not greedy_works and len(sols) > 0 and len(sols) <= 3:
        # Check if length of pool is 7-9
        if 7 <= len(pool) <= 9:
            pool.sort()
            levels.append({'need': need, 'pool': pool})

for i, lvl in enumerate(levels):
    print(f"Level {i+1}: need={lvl['need']}, pool={lvl['pool']}")
