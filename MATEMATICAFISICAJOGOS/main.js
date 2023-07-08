class SATPolygon {
  constructor(x = 0, y = 0, vertices =[], scale = 1, rotation = 0) {
    this.x = x
    this.y = y
    this.vertices = vertices
    this.scale = scale
    this.rotation = rotation
  }
  
  drawer(filla = "purple"){
    let vertices = this.getTransformedVerts();
    let vert = vertices[vertices.length-1];
    
    let points = []; 

     if (filla == "red") {
          fill(255, 0,0); // Change the color
        } else {
            fill(0, 255,0); 
            stroke('purple'); // Change the color
        }
    for (let i =0; i < vertices.length; i++){
        vert = vertices[i];
        points.push(createVector(this.x + vert.x, this.y + vert.y))
    }
    
   beginShape();
    for (let i = 0; i < points.length; i++) {
      vertex(points[i].x, points[i].y);
    }
   endShape(CLOSE);
  }

  createPolygon(pt, pt2, pt3, pt4)
    {
       this.vertices.push(pt);
       this.vertices.push(pt2);
       this.vertices.push(pt3);
       this.vertices.push(pt4);
    }

   clone()
    {
        let clone = new SATPolygon();
        clone.x = this.x;
        clone.y = this.y;
        clone.vertices = this.vertices.map(x => x.clone());
        clone.rotation = this.rotation;
        clone.scale = this.scale;
        return clone;
    }

    getTransformedVerts()
    {
        return this.vertices.map(vert => {
            var newVert = vert.clone();
            if (this.rotation != 0)
            {
                let hyp = Math.sqrt(Math.pow(vert.x, 2) + Math.pow(vert.y,2));
                let angle = Math.atan2(vert.y, vert.x);
                angle += this.rotation * (Math.PI / 180);
                
                newVert.x = Math.cos(angle) * hyp;
                newVert.y = Math.sin(angle) * hyp;
            }
            if (this.scale != 0)
            {
                newVert.x *= this.scale;
                newVert.y *= this.scale;
            }

            return newVert;
        });
    }

}

class SATCircle
{
    x = 0;
    y = 0;
    radius = 100;
    scale = 1;
    rotation = 0;

    clone() {
        let clone = new SATCircle();
        clone.x = this.x;
        clone.y = this.y;
        clone.radius = this.radius;
        clone.scale = this.scale;
        clone.rotation = this.rotation;
        return clone;
    }

    getTransformedRadius()
    {
        return this.radius * this.scale;
    }
}

class SATCollisionInfo
{
  constructor(
      shapeA = null, 
      shapeB = null,
      distance = 0, 
      vector = new SATPoint(),
      shapeAContained = false,
      shapeBContained = false,
      separation = new SATPoint()
      ){
        this.shapeA = shapeA
        this.shapeB = shapeB
        this.distance = distance
        this.vector = vector
        this.shapeAContained = shapeAContained
        this.shapeBContained = shapeBContained
        this.separation = separation
      }
}

class SAT
{

    static test(shapeA, shapeB)
    {
        if (shapeA instanceof SATCircle && shapeB instanceof SATCircle)
        {
            return this._circleCircleTest(shapeA, shapeB)
        }
        else if (shapeA instanceof SATPolygon && shapeB instanceof SATPolygon)
        {
            let testAB = this._polygonPolygonTest(shapeA, shapeB);
            if (!testAB) return null; 
            
            let testBA = this._polygonPolygonTest(shapeB, shapeA, true);  
            if (!testBA) return null; 
            
            let result = (Math.abs(testAB.distance) < Math.abs(testBA.distance)) ? testAB : testBA;

            result.shapeAContained = testAB.shapeAContained && testBA.shapeAContained;
            result.shapeBContained = testAB.shapeBContained && testBA.shapeBContained;

            return result;
        }

      
        if ((shapeA instanceof SATCircle && shapeB instanceof SATPolygon) || (shapeB instanceof SATCircle && shapeA instanceof SATPolygon))
        {
            let shapeAIsCircle = shapeA instanceof SATCircle;
            return this._circlePolygonTest(
                shapeAIsCircle ? shapeA : shapeB, 
                shapeAIsCircle ? shapeB : shapeA,
                !shapeAIsCircle);
        }

        return null;
    }

  
    static _polygonPolygonTest(polygonA, polygonB, flipResultPositions = false)
    {
        let shortestDist = Number.MAX_VALUE;


        let result = new SATCollisionInfo();
        result.shapeA = flipResultPositions ? polygonB : polygonA;
        result.shapeB = flipResultPositions ? polygonA : polygonB;
        result.shapeAContained = true;
        result.shapeBContained = true;

        let verts1 = polygonA.getTransformedVerts();
        let verts2 = polygonB.getTransformedVerts(); 

        this._patchLineVerts(verts1);
        this._patchLineVerts(verts2);

        let vOffset = new SATPoint(polygonA.x - polygonB.x, polygonA.y - polygonB.y);
        
        for (let i = 0; i < verts1.length; i++)
        {
            let axis = SAT._getPerpendicularAxis(verts1, i);
            let polyARange = SAT._projectVertsForMinMax(axis, verts1);
            let polyBRange = SAT._projectVertsForMinMax(axis, verts2);

            var scalerOffset = SAT._vectorDotProduct(axis, vOffset);
            polyARange.min += scalerOffset;
            polyARange.max += scalerOffset;

            if ( (polyARange.min - polyBRange.max > 0) || (polyBRange.min - polyARange.max > 0)  )
            {
                return null;
            }

            this._checkRangesForContainment(polyARange, polyBRange, result, flipResultPositions);

            let distMin = (polyBRange.max - polyARange.min) * -1;
            if (flipResultPositions) distMin *= -1;

            let distMinAbs = Math.abs(distMin);
            if (distMinAbs < shortestDist)
            {
                shortestDist = distMinAbs;

                result.distance = distMin;
                result.vector = axis;
            }
        }

        result.separation = new SATPoint(result.vector.x * result.distance, result.vector.y * result.distance);

        return result;

    }

    static _circlePolygonTest(circle, polygon, flipResultPositions)
    {
        let shortestDist = Number.MAX_VALUE;

        let result = new SATCollisionInfo();
        result.shapeA = flipResultPositions ? polygon : circle;
        result.shapeB = flipResultPositions ? circle : polygon;
        result.shapeAContained = true;
        result.shapeBContained = true;  
        
        let verts = polygon.getTransformedVerts();  //.vertices.map(x => x.clone());
        this._patchLineVerts(verts);        

        let vOffset = new SATPoint(polygon.x - circle.x, polygon.y - circle.y);

        let closestVertex = new SATPoint();
        for (let vert of verts)
        {
            let dist = Math.pow(circle.x - (polygon.x + vert.x), 2) + Math.pow(circle.y - (polygon.y + vert.y), 2);
            if (dist < shortestDist)
            {
                shortestDist = dist;
                closestVertex.x = polygon.x + vert.x;
                closestVertex.y = polygon.y + vert.y;
            }
        }


        let axis = new SATPoint(closestVertex.x - circle.x, closestVertex.y - circle.y);
        axis.normalize();

        let polyRange = SAT._projectVertsForMinMax(axis, verts);

        var scalerOffset = SAT._vectorDotProduct(axis, vOffset);
        polyRange.min += scalerOffset;
        polyRange.max += scalerOffset;

        let circleRange = this._projectCircleForMinMax(axis, circle);

        if ( (polyRange.min - circleRange.max > 0) || (circleRange.min - polyRange.max > 0)  )
        {
            return null;
        }


        let distMin = (circleRange.max - polyRange.min);
        if (flipResultPositions) distMin *= -1;

        shortestDist = Math.abs(distMin);

        result.distance = distMin;
        result.vector = axis;
        
        this._checkRangesForContainment(polyRange, circleRange, result, flipResultPositions);


        for (let i = 0; i < verts.length; i++)
        {
            axis = SAT._getPerpendicularAxis(verts, i);
            polyRange = SAT._projectVertsForMinMax(axis, verts);

            var scalerOffset = SAT._vectorDotProduct(axis, vOffset);
            polyRange.min += scalerOffset;
            polyRange.max += scalerOffset;

            circleRange = this._projectCircleForMinMax(axis, circle);

            if ( (polyRange.min - circleRange.max > 0) || (circleRange.min - polyRange.max > 0)  )
            {
                return null;
            }

            this._checkRangesForContainment(polyRange, circleRange, result, flipResultPositions);

            distMin = (circleRange.max - polyRange.min);// * -1;
            if (flipResultPositions) distMin *= -1;

            let distMinAbs = Math.abs(distMin);
            if (distMinAbs < shortestDist)
            {
                shortestDist = distMinAbs;

                result.distance = distMin;
                result.vector = axis;
            }
        }

        result.separation = new SATPoint(result.vector.x * result.distance, result.vector.y * result.distance);

        return result;
    }


    static _checkRangesForContainment(rangeA, rangeB, collisionInfo, flipResultPositions)
    {
        if (flipResultPositions)
        {
            if (rangeA.max < rangeB.max || rangeA.min > rangeB.min) collisionInfo.shapeAContained = false;				
            if (rangeB.max < rangeA.max || rangeB.min > rangeA.min) collisionInfo.shapeBContained = false;	
        }
        else
        {
            if (rangeA.max > rangeB.max || rangeA.min < rangeB.min) collisionInfo.shapeAContained = false;
            if (rangeB.max > rangeA.max || rangeB.min < rangeA.min) collisionInfo.shapeBContained = false;
        }
    }



    static _projectVertsForMinMax(axis, verts)
    {
        let min = SAT._vectorDotProduct(axis, verts[0]);
        let max = min;

        for (let j = 1; j < verts.length; j++)
        {
            let temp = SAT._vectorDotProduct(axis, verts[j]);
            if (temp < min) min = temp;
            if (temp > max) max = temp;
        }

        return {min: min, max: max};
    }

    static _projectCircleForMinMax(axis, circle) {
        let proj = this._vectorDotProduct(axis, new SATPoint(0,0) );
        return {
            min: proj - circle.getTransformedRadius(),
            max: proj + circle.getTransformedRadius()
        };
    }

    static _vectorDotProduct(pt1, pt2)
    {
        return (pt1.x * pt2.x) + (pt1.y * pt2.y);
    }


    static _getPerpendicularAxis(verts, index)
    {
        let pt1 = verts[index];
        let pt2 = index >= verts.length-1 ? verts[0] : verts[index+1];  

        let axis = new SATPoint(-(pt2.y - pt1.y), pt2.x - pt1.x);
        axis.normalize();
        return axis;
    }


    static _patchLineVerts(verts)
    {
        if (verts.length == 2)
        {
            let [p1,p2] = verts;
            var pt = new SATPoint(-(p2.y - p1.y), p2.x - p1.x);
            pt.magnitude = 0.000001;
            verts.push(pt);
        }
    }


    static _circleCircleTest(circleA, circleB,)
    {
        let radiusTotal = circleA.getTransformedRadius() + circleB.getTransformedRadius();
        let distanceBetween = Math.sqrt(Math.pow(circleB.x - circleA.x, 2) + Math.pow(circleB.y - circleA.y, 2));

        if (distanceBetween >radiusTotal)
            return null; 

        let result = new SATCollisionInfo();
        result.shapeA = circleA;
        result.shapeB = circleB;
        
    
        result.vector = new SATPoint(circleB.x - circleA.x, circleB.y - circleA.y);
        result.vector.normalize(); 

        result.distance = distanceBetween

        var diff = radiusTotal - distanceBetween
        result.separation = new SATPoint(result.vector.x * diff, result.vector.y * diff);

        var radA = circleA.getTransformedRadius();
        var radB = circleB.getTransformedRadius();
        result.shapeAContained = radA <= radB && distanceBetween <= radB - radA;
        result.shapeBContained = radB <= radA && distanceBetween <= radA - radB;

        return result;
    }
}

class SATPoint
{
    constructor(x = 0, y = 0)
    {
        this.x = x;
        this.y = y;
    }

    normalize()
    {
        this.magnitude = 1;
    }

    set magnitude(value) {
        let len = Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2));
        if (len == 0)
            return;
        let ratio = value / len;
        this.x *= ratio;
        this.y *= ratio;
    }
    get magnitude() {
        return Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2));
    }


    clone()
    {
        let clone = new SATPoint();
        clone.x = this.x;
        clone.y = this.y;
        return clone;
    }
}


class vec2{
  constructor(x=0, y=0){
    this.x = x
    this.y = y
  }
  
  randomize(len = 1.0){
    let angle = random(0,2*PI)
    this.x = len * cos(angle)
    this.y = len * sin(angle)
  }
  
  length(){
    return sqrt(this.x * this.x + this.y * this.y)
  }
  
  add(v){
    return new vec2(this.x + v.x, this.y + v.y)
  }
  dot(v){
    return this.x * v.x + this.y * v.y
  }
  normalized(){
    let len = this.length()
    return new vec2(this.x/len, this.y/len)
  }
  mul(s){
    let len = this.length()
    return new vec2(this.x * s, this.y * s)
  }
  normal() { //vetor perpendicular a este
    return new vec2(-this.y, this.x)
  }
  plot () {
    circle(this.x, this.y, 4)
  }
  render(position = new vec2()){
    let fim = this.add(position)
    arrow(position.x, position.y, fim.x, fim.y)
  }
}

class aabb extends SATPolygon {
  constructor(cloudPoints = [], center0 = false, colision = false) {
    super();
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
    this.cloudPoints = cloudPoints
    this.width = 0
    this.height = 0
    this.geraMinAndMax(cloudPoints)
    this.center0 = center0
    this.colision = colision
  }
  
  geraMinAndMax(points) {
    for (let i = 0; i < points.length; i++) {
      this.update(points[i]);
    }
  }
  
  static gerarPontos(){
    let rectWidth = random(100, min(300, width));
    let rectHeight = random(100, min(100, height));
    let rectX = random(width - rectWidth);
    let rectY = random(height - rectHeight);
    let cloudPoints = []

    for (let i = 0; i < 100; i++) { 
      let x = random(rectX, rectX + rectWidth);
      let y = random(rectY, rectY + rectHeight);
      cloudPoints.push(createVector(x, y));
    }
    return cloudPoints
  }

  update(point) {
    this.minX = min(this.minX, point.x);
    this.minY = min(this.minY, point.y);
    this.maxX = max(this.maxX, point.x);
    this.maxY = max(this.maxY, point.y);
    this.width = this.maxX - this.minX
    this.height = this.maxY - this.minY
  }

  draw() {
    let mouseXCorret = mouseXC
    let mouseYCorret = mouseYC
    
    if (this.center0) {
      mouseXCorret = 0
      mouseYCorret = 0
    }
    
    let v1Point = new SATPoint((mouseXCorret - this.width / 2),  (mouseYCorret + this.height / 2))
    let v2Point = new SATPoint((mouseXCorret + this.width / 2) ,  (mouseYCorret + this.height / 2))
    let v3Point = new SATPoint((mouseXCorret - this.width / 2)  ,  (mouseYCorret - this.height / 2))
    let v4Point = new SATPoint((mouseXCorret + this.width / 2),  ( mouseYCorret - this.height / 2 )) 
    
    this.createPolygon(
      v2Point, //ok
      v4Point, //ok
      v3Point,
      v1Point //ok
    )
    
    push()
      textSize(15)
      texto("1",  v1Point.x, v1Point.y)
      texto("2", v2Point.x, v2Point.y)
      texto("3", v3Point.x, v3Point.y)
      texto("4", v4Point.x, v4Point.y)
    pop()
   

    push()
      let widthA = this.width / 2
      let heightA = this.height / 2
      translate((-this.minX + mouseXCorret - widthA), -this.minY + mouseYCorret - heightA )
      for (let i = 0; i < this.cloudPoints.length; i++) {
        let pt = this.cloudPoints[i];
        ellipse(pt.x, pt.y, 5, 5);
      }
    pop()
    
    push()
      if (this.colision) {
        fill(255,0,0)
      } else {
        noFill()
      }
      rect(mouseXCorret - this.width/2, mouseYCorret - this.height /2, this.maxX - this.minX, this.maxY - this.minY);
    pop()
  }
}


class obb extends SATPolygon{
  constructor(points = [], axis = new vec2()){
    super();
    this.c = new vec2() //center
    this.e = new vec2() //raios em x e y
    //vetores unitarios e perpendicular u e v
    this.u = axis.normalized()
    this.v = this.u.normal()
    this.fit(points)
  }
  
 
  fit(points){
    this.points = points
  }
  
  project(points, axis){ //min, max
    let mi = Infinity
    let ma = -Infinity
    
    
    for (let i =0; i < points.length; i++){ 
      let dott = axis.dot(points[i])
      mi = min(mi, dott)
      ma = max(ma, dott)
      
      
      let p1 = axis.mul(dott)
      line(p1.x, p1.y, points[i].x, points[i].y)
    }
    
    return [mi, ma]
  }
  
  
  render (colision = false){
    let plusX =  mouseXC
    let plusY = mouseYC
    // min e max
    noStroke(196, 160, 160)
    let pu =  this.project(this.points, this.u)
    
    noStroke(196, 160, 160)
    let pv = this.project(this.points, this.v)
  
    let uc = (pu[0] + pu[1]) / 2  
    let vc = (pv[0] + pv [1]) /2
    
    
    
    this.c = this.u.mul(uc).add(this.v.mul(vc))
    this.e = new vec2(
                  (pu[1] - pu[0])/2,
                  (pv[1] - pv[0]) /2
              )
    
    
    
    fill(100,196,0)
    stroke(100,196,0)
    this.u.mul(this.e.x).render(this.c)
    
    fill(196,100,0)
    stroke(100,196,0)
    this.v.mul(this.e.y).render(this.c)
    
    let c1 = this.u.mul(this.e.x).
              add(this.v.mul(this.e.y)).
              add(this.c)
    
    let c2 = this.u.mul(-this.e.x).
            add(this.v.mul(this.e.y)).
            add(this.c)

    let c3 = this.u.mul(-this.e.x).
            add(this.v.mul(-this.e.y)).
            add(this.c)
    
    let c4 = this.u.mul(this.e.x).
        add(this.v.mul(-this.e.y)).
        add(this.c)
    
    this.createPolygon(
      new SATPoint(c1.x, c1.y),
      new SATPoint(c2.x, c2.y),
      new SATPoint(c3.x, c3.y),
      new SATPoint(c4.x, c4.y)
    )
    
    
    c1.plot()
    c2.plot()
    c3.plot()
    c4.plot()
    
    if(colision) {
      fill(255, 0, 0)
    } else {
      noFill()
    }
    
    stroke(128)
    quad(c1.x, c1.y , c2.x , c2.y, c3.x , c3.y, c4.x , c4.y)
    
    fill(100,196,255)
    stroke(100,196,255)
   
    this.c.plot()
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  display() {
    stroke(255);
    strokeWeight(4);
    point(this.x, this.y);
  }
}

class BoundingCircle extends SATCircle{
  constructor(points = [], center0 = false, colision = false) {
    super()
    this.points = points
    this.calculateBoundingCircle()
    this.colision = colision
  }
  
  calculateBoundingCircle() {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let point of this.points) {
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
      }

      let center = createVector((minX + maxX) / 2, (minY + maxY) / 2);
      let radius = dist(minX, minY, maxX, maxY) / 2;

      this.center = center
      this.radius = radius
      this.minX = minX
      this.minY = minY
      this.maxX = maxX
      this.maxY = maxY
  }
  
  static gerarPontos(){
    let points = []
    // Gerar nuvem de pontos aleatórios
    for (let i = 0; i < 100; i++) {
      let x = random(width);
      x/=5
      let y = random(height);
      y/=5
      points.push(new Point(x, y));
    }
    return points
  }

  display() {
    let mouseXCorrect = mouseXC
    let mouseYCorrect = mouseYC
    
    if (this.center0) {
      mouseXCorrect = 0
      mouseYCorrect = 0
    }
    
    
    this.x = mouseXCorrect
    this.y = mouseYCorrect
  
   
    push()
      fill(0, 0, 255)
      strokeWeight(2)
      translate(-this.center.x + mouseXCorrect, -this.center.y + mouseYCorrect )
       // Exibir pontos
        for (let point of this.points) {
          point.display();
        }
    pop()
    
    if (this.colision) {
      fill(255, 0, 0)
    } else {
      noFill();
    }
    stroke(255, 0, 0);
    strokeWeight(2);
    circle(mouseXCorrect, mouseYCorrect, this.radius * 2);
  }
}


function randomPoints(n = 100, c = new vec2(), angleFunction = 0, listVector = []){
  let list = JSON.parse(JSON.stringify(listVector))
  let ret = []
  
  let angle = angleFunction
  let ca = cos(angle)
  let sa = sin(angle)
  for (let i = 0; i < 100; i++){
    let p = list[i]
    p.x /= 2
    
    let p2x = ca * p.x - sa * p.y
    let p2y = sa*p.x + ca * p.y
    p.x = p2x
    p.y = p2y
    
    
    p = c.add(p)
    ret.push(p)
  }
  
  return ret
}

function retornaCopiaArray(){
  let copiaArray = listVectorsTop.slice()
  return copiaArray
}

let u = new vec2()
let u2 = new vec2()
let P = []
let P2 = []
let box,box2, abb2

var mouseXC, mouseYC = 0
var angleTop, angleTop2 = 0
var listVectorsTop, listVectorsTop2 = []
let collisionInfo = false
let pointABB, pointsABB0 = []

let sorteio, sorteio2 = 0
let boundingCircle, boudingleCircle2

function geraAnguloTop(){
  let angle = random()
  return angle
}

function geradorVetoresAleatorio(){
  let listTest = []
  
  for (let i = 0; i < 100; i++) {
    let pTop = new vec2()
    pTop.randomize(random(50, 100))
    listTest.push(pTop)
  }
  
  return listTest
}

function setup(){
  createCanvas(800,800)
  u.randomize(50)
  u2.randomize(50)
  angleTop2 = geraAnguloTop()
  angleTop = geraAnguloTop()
  listVectorsTop = geradorVetoresAleatorio()
  listVectorsTop2 = geradorVetoresAleatorio()
  let pointsCircle = BoundingCircle.gerarPontos()
  let pointsCircle2 = BoundingCircle.gerarPontos()
  boundingCircle = new BoundingCircle(pointsCircle)
  boudingleCircle2 = new BoundingCircle(pointsCircle2)
  
  pointABB = aabb.gerarPontos()
  pointsABB0 = aabb.gerarPontos()
  sorteio = random(0,2).toFixed(0)
  sorteio2 = random(0,2).toFixed(0)
  
}

function draw(){
  goCartesian() 
  
  let poligono1, poligono2
  poligonosTestados()
  
  if (sorteio == 0) {
     poligono1 = gerarABB1()
  } else if (sorteio == 1) {
     poligono1 = gerarOBB1()
  } else {
     poligono1 = boundingCircle
     boundingCircle.display()
  }
  
  
  if (sorteio2 == 0) {
    poligono2 = collisionInfo ? gerarABB1Center(true) : gerarABB1Center(false)
  } else if (sorteio2 == 1) {
    poligono2 = collisionInfo ? gerarOBB2Center(true) :gerarOBB2Center()
  } else {
    boudingleCircle2.center0 = true
    poligono2 = boudingleCircle2
    poligono2.colision = collisionInfo ? true : false
    boudingleCircle2.display()
  }

  
  let cloneA = poligono1.clone()
  let cloneB = poligono2.clone()
  collisionInfo = SAT.test(cloneA, cloneB) 
}


function poligonosTestados(){
  let textosDisponiveis = ["AABB", "OOBB","CÍRCULO"]
  
  textSize(32)
  texto(textosDisponiveis[sorteio]+" x "+textosDisponiveis[sorteio2], 20, 200)
  
  textSize(20)
  texto("ANTÔNIO GUILHERME DO NASCIMENTO PEREIRA (495250) ", -400, -200)
  texto("REINALDO DA SILVA NASCIMENTO (499888)", -400, -250)
  
}

function gerarABB1(){
  let aabbTest = new aabb(pointABB)
  aabbTest.draw()
  return aabbTest
}

function gerarABB1Center(colision = false){
  let aabbTest2 = new aabb(pointsABB0, true, colision)
  aabbTest2.draw()
  return aabbTest2
}

function gerarOBB1(colision = false){
  P = randomPoints(75, new vec2(mouseXC, mouseYC), angleTop, listVectorsTop)
  let box = new obb(P, u) 
  
  //pontos primeiro, BKG
  fill(0, 0, 129) 
  stroke(0, 0, 196)
  
  for ( let i =0 ; i < P.length; i++) {
    P[i].plot()
  }
  

  stroke(196)
  fill(196)
  box.render(colision)
  return box
}

function gerarOBB2Center(colision = false){
  P2 = randomPoints(75, new vec2(0, 0), angleTop2, listVectorsTop2)
  box2 = new obb(P2, u2) 
  
  //pontos primeiro, BKG
  
  for ( let i =0 ; i < P2.length; i++) {
    fill(0, 0, 129) 
    stroke(0, 0, 196)
    P2[i].plot()
  }
  
  stroke(196)
  fill(196)
  box2.render(colision)
  return box2
}


function goCartesian()
{
  background(0)
  
  mouseXC = mouseX - width/2
  mouseYC = height/2 - mouseY
  
  colore(128,0,0)
  arrow(0,height/2,width, height/2)
  colore(0,128,0)
  arrow(width/2,height,width/2, 0)
  
  translate(width/2,height/2)
  scale(1,-1,1)  
}

function grabMouse()
{
  mouseXC = mouseX - width/2
  mouseYC = height/2 - mouseY
}

function texto(str,x,y)
{
  push()
    resetMatrix();
    translate(width/2,height/2)
    text(str,x,-y)
  pop()
}


function colore(c1,c2,c3,c4)
{
  if(c4 != null)
  {
    fill(c1,c2,c3,c4)
    stroke(c1,c2,c3,c4)
    return
  }
  if(c3 != null)
  {
    fill(c1,c2,c3)
    stroke(c1,c2,c3)
    return
  }
  
  if(c2 == null )
  {
    fill(c1)
    stroke(c1)
  }
  else
  {
    fill(c1,c1,c1,c2)
    stroke(c1,c1,c1,c2)
  }    
}

function arrow(x1,y1,x2,y2)
{
  line(x1,y1,x2,y2)
  var dx = x2-x1, dy = y2-y1
  var le = sqrt(dx*dx + dy*dy)
  var vx = dx/le, vy = dy/le
  var ux = -vy
  var uy = vx
  triangle(x2,y2,
           x2-5*vx+2*ux, y2-5*vy+2*uy,
           x2-5*vx-2*ux, y2-5*vy-2*uy)
}

